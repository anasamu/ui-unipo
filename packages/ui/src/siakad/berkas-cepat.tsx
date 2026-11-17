'use client';
import * as React from 'react';
import { Download, File, FileArchive, FileImage, FileSpreadsheet, FileText, FolderOpen, Upload } from 'lucide-react';
import { Button, Skeleton } from '../components/actions';
import { Empty } from '../components/display';
import { Dialog, Popover } from '../components/overlays';
import { cn } from '../lib/cn';
import { formatBytes } from '../lib/format';
import { unggahKeBerkas, type BerkasTerunggah, type InfoBerkas, type OpsiUnggahBerkas } from './berkas';
import { DriveBerkas } from './drive-berkas';
import { invalidateSiakad, useOptionalSiakad } from './provider';
import { waktuRelatif } from './notifikasi';

/**
 * Kelola berkas cepat dari bilah atas: unggah (tombol atau tarik-lepas), berkas terbaru dengan tombol unduh, dan
 * "Kelola berkas" yang membuka penyimpanan lengkap (DriveBerkas). Memakai /v1/berkas (scope berkas:read, berkas:write).
 */

type Berkas = BerkasTerunggah & { dibuat_at?: string | null };
type Unggahan = { nama: string; persen: number; galat?: string };

const diam = (e: unknown) => [401, 403, 404].includes(Number((e as { status?: number })?.status));

function IkonBerkas({ b }: { b: Berkas }) {
  const e = (b.ekstensi ?? b.nama.split('.').pop() ?? '').toLowerCase();
  if (/^(png|jpe?g|gif|webp|svg|heic)$/.test(e)) return <FileImage />;
  if (/^(xlsx?|csv|ods)$/.test(e)) return <FileSpreadsheet />;
  if (/^(zip|rar|7z|tar|gz)$/.test(e)) return <FileArchive />;
  if (/^(pdf|docx?|odt|txt|rtf|pptx?)$/.test(e)) return <FileText />;
  return <File />;
}

export interface TombolBerkasProps extends Pick<OpsiUnggahBerkas, 'modul' | 'unit' | 'kategori'> {
  /** Jumlah berkas terbaru di panel. Bawaan 6. */
  jumlah?: number;
  /**
   * Aksi "Kelola berkas". Bawaan membuka DriveBerkas dalam dialog. Isi bila aplikasi punya halaman berkas sendiri,
   * mis. `() => navigate('/berkas')`.
   */
  onKelola?: () => void;
  /** Unit yang tampil di DriveBerkas dialog bawaan (mis. ["bauk"]). */
  unitTampil?: string[];
  className?: string;
}

/**
 * Ikon berkas di bilah atas. Tidak tampil bila token tidak punya akses berkas.
 */
export function TombolBerkas({ jumlah = 6, onKelola, unitTampil, modul, unit, kategori = 'dokumen', className }: TombolBerkasProps) {
  const siakad = useOptionalSiakad();
  const [tersedia, setTersedia] = React.useState(true);
  const [info, setInfo] = React.useState<InfoBerkas | null>(null);
  const [buka, setBuka] = React.useState(false);
  const [drive, setDrive] = React.useState(false);
  const [daftar, setDaftar] = React.useState<Berkas[] | null>(null);
  const [unggahan, setUnggahan] = React.useState<Unggahan[]>([]);
  const [seret, setSeret] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!siakad) return;
    let batal = false;
    siakad
      .request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' }, { maxRetries: 0 })
      .then((r) => !batal && setInfo(r.data))
      .catch((e) => !batal && diam(e) && setTersedia(false));
    return () => {
      batal = true;
    };
  }, [siakad]);

  const muat = React.useCallback(async () => {
    if (!siakad) return;
    try {
      const query: Record<string, string> = { per_page: String(jumlah), urut: 'baru', status: 'tersedia' };
      if (modul) query.modul = modul;
      if (unit) query.unit = unit;
      const r = await siakad.request<Berkas[]>({ method: 'GET', path: '/v1/berkas', query });
      setDaftar(Array.isArray(r.data) ? r.data : []);
    } catch (e) {
      if (diam(e)) setTersedia(false);
      setDaftar((d) => d ?? []);
    }
  }, [siakad, jumlah, modul, unit]);

  if (!siakad || !tersedia) return null;

  const unggah = async (files: FileList | File[]) => {
    const daftarFile = Array.from(files);
    if (!daftarFile.length) return;
    const i = info ?? (await siakad.request<InfoBerkas>({ method: 'GET', path: '/v1/berkas/info' })).data;
    setUnggahan((u) => [...u, ...daftarFile.map((f) => ({ nama: f.name, persen: 0 }))]);
    for (const f of daftarFile) {
      const ubah = (p: Partial<Unggahan>) => setUnggahan((u) => u.map((x) => (x.nama === f.name ? { ...x, ...p } : x)));
      if (f.size > i.maks_byte) {
        ubah({ galat: `Lebih dari ${formatBytes(i.maks_byte)}` });
        continue;
      }
      try {
        await unggahKeBerkas(siakad, i, f, { modul, unit, kategori }, (persen) => ubah({ persen }));
        setUnggahan((u) => u.filter((x) => x.nama !== f.name));
      } catch (e) {
        ubah({ galat: (e as Error)?.message || 'Gagal mengunggah' });
      }
    }
    invalidateSiakad('berkas-isi');
    invalidateSiakad('berkas-folder');
    void muat();
  };

  const unduh = async (b: Berkas) => {
    try {
      const r = await siakad.request<{ url: string }>({ method: 'GET', path: `/v1/berkas/${encodeURIComponent(b.id)}/url`, query: { ttl: 300 } });
      if (r.data?.url) window.open(r.data.url, '_blank', 'noopener');
    } catch {
      /* galat ditangani di halaman berkas */
    }
  };

  const kelola = () => {
    setBuka(false);
    if (onKelola) onKelola();
    else setDrive(true);
  };

  return (
    <>
      <Popover
        open={buka}
        onOpenChange={(o) => {
          setBuka(o);
          if (o) void muat();
        }}
        align="end"
        width={360}
        className={cn('u-kabar-panel', className)}
        trigger={
          <Button variant="ghost" size="sm" iconOnly className="u-kabar-tombol" aria-label={unggahan.some((u) => !u.galat) ? 'Berkas, sedang mengunggah' : 'Berkas'}>
            <FolderOpen />
            {unggahan.some((u) => !u.galat) && <span className="u-kabar-lencana" data-proses aria-hidden />}
          </Button>
        }
      >
        <div className="u-kabar-kepala">
          <span className="u-kabar-judul">Berkas</span>
          <Button variant="soft" size="xs" onClick={() => inputRef.current?.click()}>
            <Upload /> Unggah
          </Button>
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            accept={info?.ekstensi?.length ? info.ekstensi.map((e) => `.${e}`).join(',') : undefined}
            onChange={(e) => {
              if (e.target.files) void unggah(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        <div
          className="u-berkas-cepat-jatuh"
          data-seret={seret ? '' : undefined}
          onDragOver={(e) => {
            e.preventDefault();
            setSeret(true);
          }}
          onDragLeave={() => setSeret(false)}
          onDrop={(e) => {
            e.preventDefault();
            setSeret(false);
            void unggah(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), inputRef.current?.click())}
        >
          <Upload aria-hidden />
          <span>
            Tarik berkas ke sini atau <b>pilih berkas</b>
            {info && <small>Maks. {formatBytes(info.maks_byte)} per berkas</small>}
          </span>
        </div>
        {unggahan.length > 0 && (
          <div className="u-berkas-cepat-unggah" aria-live="polite">
            {unggahan.map((u) => (
              <div key={u.nama} data-galat={u.galat ? '' : undefined}>
                <span>{u.nama}</span>
                <small>{u.galat ?? `${u.persen}%`}</small>
                {!u.galat && <i style={{ width: `${u.persen}%` }} />}
              </div>
            ))}
          </div>
        )}
        <div className="u-kabar-sub">Terbaru</div>
        {daftar === null ? (
          <div className="u-kabar-daftar" aria-busy>
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} height={40} />
            ))}
          </div>
        ) : daftar.length ? (
          <div className="u-kabar-daftar" role="list">
            {daftar.map((b) => (
              <div key={b.id} role="listitem" className="u-kabar-item u-berkas-cepat-item">
                <span className="u-berkas-cepat-ikon" aria-hidden>
                  <IkonBerkas b={b} />
                </span>
                <span className="u-kabar-item-teks">
                  <span className="u-kabar-item-atas">
                    <b title={b.nama}>{b.nama}</b>
                  </span>
                  <span className="u-kabar-item-isi">
                    {formatBytes(b.ukuran)}
                    {b.dibuat_at ? ` · ${waktuRelatif(b.dibuat_at)}` : ''}
                  </span>
                </span>
                <Button variant="ghost" size="xs" iconOnly aria-label={`Unduh ${b.nama}`} onClick={() => void unduh(b)}>
                  <Download />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <Empty icon={<FolderOpen />} title="Belum ada berkas" description="Berkas yang Anda unggah tampil di sini." />
        )}
        <div className="u-kabar-kaki">
          <Button variant="ghost" size="sm" onClick={kelola}>
            Kelola berkas
          </Button>
        </div>
      </Popover>
      {!onKelola && (
        <Dialog open={drive} onOpenChange={setDrive} title="Kelola berkas" size="xl">
          {drive && <DriveBerkas modul={modul} unitTampil={unitTampil} tinggi="min(40rem, 70dvh)" />}
        </Dialog>
      )}
    </>
  );
}
