'use client';
import * as React from 'react';
import { Building2, CopyPlus, Download, FolderOpen, Globe, HardDrive, Inbox, Share2, Trash2, UserRound } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { SegmentedControl } from '../components/forms';
import { cn } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { useDibagikanBerkas, type BagiBerkas } from './berkas-ruang';
import { DaftarDrive, useDriveBerkas, type DriveBerkasData } from './daftar-drive';
import { Dialog } from '../components/overlays';
import { ManajerBerkas, useAksiBerkas, type ManajerBerkasProps } from './manajer-berkas';
import { invalidateSiakad, pesanGalat, useSiakad } from './provider';

export interface DriveBerkasProps extends Omit<ManajerBerkasProps, 'unit' | 'bagi' | 'judul'> {
  /** Ruang yang dibuka pertama kali: "saya", kode unit, id drive (mis. "arsip:univ"), atau "dibagikan". Bawaan unit pertama dari `unitTampil`, selain itu "saya". */
  ruangAwal?: string;
  /** Batasi unit yang tampil (mis. ["bauk"] di aplikasi BAUK). Kosong = semua unit yang bisa dibuka pengguna. */
  unitTampil?: string[];
  /** Tampilkan "Berkas saya" (bawaan true). */
  tampilPribadi?: boolean;
  /** Tampilkan "Dibagikan" (bawaan true). */
  tampilDibagikan?: boolean;
}

type Pilihan = { jenis: 'drive'; id: string } | { jenis: 'dibagikan' } | { jenis: 'bagi'; id: string; nama: string };

/**
 * Penyimpanan berkas lengkap: berkas pribadi, ruang bersama setiap unit yang bisa dibuka pengguna (universitas, fakultas,
 * prodi, BAAK, BAUK, SDM, LPM, PMB, LPPM, ...), ruang arsip institusi, dan berkas/folder yang dibagikan ke pengguna.
 * Ruang tampil sebagai DAFTAR DRIVE berjenjang di sidebar (GET /v1/berkas/drive): Berkas saya, lalu pohon unit dari unit
 * tertinggi, masing-masing dengan bar pemakaian terhadap batas yang mengikat; folder drive aktif tampil di bawahnya.
 * Di layar sempit sidebar menjadi lembar "Drive & folder". Tiap ruang memakai ManajerBerkas.
 */
export function DriveBerkas({ ruangAwal, unitTampil, tampilPribadi = true, tampilDibagikan = true, className, tinggi = '40rem', ...props }: DriveBerkasProps) {
  const dq = useDriveBerkas();
  const drive = React.useMemo(() => {
    let d = (dq.drive ?? []).filter((x) => (x.jenis === 'pribadi' ? tampilPribadi : true));
    if (unitTampil?.length) {
      // Aplikasi bagian (mis. BAUK): hanya unit yang diminta, tanpa pohon.
      d = d.filter((x) => x.jenis === 'pribadi' || (x.unit_id && unitTampil.includes(x.unit_id) && x.hak !== null)).map((x) => ({ ...x, induk: null, tingkat: 0 }));
    }
    return d;
  }, [dq.drive, unitTampil, tampilPribadi]);
  const awal = (): Pilihan =>
    ruangAwal === 'dibagikan'
      ? { jenis: 'dibagikan' }
      : ruangAwal && ruangAwal !== 'saya'
        ? { jenis: 'drive', id: ruangAwal.includes(':') ? ruangAwal : `unit:${ruangAwal}` }
        : unitTampil?.[0]
          ? { jenis: 'drive', id: `unit:${unitTampil[0]}` }
          : tampilPribadi
            ? { jenis: 'drive', id: 'pribadi' }
            : { jenis: 'dibagikan' };
  const [pilih, setPilih] = React.useState<Pilihan>(awal);
  // Bila drive yang diminta tidak bisa dibuka pengguna, kembali ke ruang pribadi (atau drive pertama).
  React.useEffect(() => {
    if (pilih.jenis !== 'drive' || !dq.drive) return;
    if (!drive.some((x) => x.id === pilih.id && x.hak !== null)) {
      const pertama = drive.find((x) => x.hak !== null);
      setPilih(pertama ? { jenis: 'drive', id: pertama.id } : { jenis: 'dibagikan' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dq.drive]);
  const aktif = pilih.jenis === 'drive' ? (drive.find((x) => x.id === pilih.id) ?? null) : null;
  const unitAktif = aktif?.ruang.unit ?? (pilih.jenis === 'drive' && pilih.id.startsWith('unit:') ? pilih.id.slice(5) : undefined);

  const daftar = (folder?: React.ReactNode) => (
    <DaftarDrive
      drive={drive}
      aktif={pilih.jenis === 'drive' ? pilih.id : null}
      memuat={dq.loading}
      onPilih={(d) => setPilih({ jenis: 'drive', id: d.id })}
      folder={folder}
      dibagikan={tampilDibagikan ? { aktif: pilih.jenis !== 'drive', onPilih: () => setPilih({ jenis: 'dibagikan' }) } : undefined}
    />
  );

  return (
    <div className={cn('u-db', className)}>
      {pilih.jenis === 'dibagikan' ? (
        <div className="u-db-tata" style={{ height: tinggi }}>
          <aside className="u-mb-samping" aria-label="Drive">
            <div className="u-mb-samping-kepala">
              <span>Drive</span>
            </div>
            <div className="u-mb-samping-isi">{daftar()}</div>
          </aside>
          <div className="u-db-tata-utama">
            <PemilihDriveSempit drive={drive} onPilih={(d) => setPilih({ jenis: 'drive', id: d.id })} />
            <DaftarDibagikan bukaFolder={(id, nama) => setPilih({ jenis: 'bagi', id, nama })} />
          </div>
        </div>
      ) : (
        <>
          {pilih.jenis === 'bagi' && (
            <div className="u-db-kembali">
              <Button variant="ghost" size="sm" onClick={() => setPilih({ jenis: 'dibagikan' })}>
                ← Semua yang dibagikan
              </Button>
              <span>Folder bersama: hanya bisa dilihat, diunduh, dan disalin ke ruang Anda.</span>
            </div>
          )}
          <ManajerBerkas
            key={pilih.jenis === 'bagi' ? `bagi:${pilih.id}` : pilih.id}
            {...props}
            modul={aktif?.ruang.modul ?? props.modul}
            tinggi={tinggi}
            unit={pilih.jenis === 'drive' ? (unitAktif ?? undefined) : undefined}
            bagi={pilih.jenis === 'bagi' ? pilih.id : undefined}
            judul={pilih.jenis === 'bagi' ? pilih.nama : aktif && aktif.jenis !== 'pribadi' ? aktif.nama : undefined}
            samping={daftar}
          />
        </>
      )}
    </div>
  );
}

/** Pemilih drive untuk layar sempit saat sidebar tersembunyi (tampilan Dibagikan). */
function PemilihDriveSempit({ drive, onPilih }: { drive: DriveBerkasData[]; onPilih: (d: DriveBerkasData) => void }) {
  const [buka, setBuka] = React.useState(false);
  return (
    <div className="u-db-pemilih-sempit">
      <Button variant="outline" size="sm" onClick={() => setBuka(true)}>
        <HardDrive aria-hidden />
        Pilih drive
      </Button>
      <Dialog open={buka} onOpenChange={setBuka} title="Drive" side="left" size="sm">
        <div className="u-mb-pohon-panel">
          <DaftarDrive
            drive={drive}
            aktif={null}
            onPilih={(d) => {
              setBuka(false);
              onPilih(d);
            }}
          />
        </div>
      </Dialog>
    </div>
  );
}

function asal(x: BagiBerkas) {
  return x.dibuat_oleh ? `dari ${x.dibuat_oleh}` : '';
}

/** Daftar berkas dan folder yang dibagikan ke saya, dan yang saya bagikan (dengan tombol cabut). */
export function DaftarDibagikan({ bukaFolder }: { bukaFolder?: (id: string, nama: string) => void }) {
  const siakad = useSiakad();
  const aksi = useAksiBerkas();
  const [arah, setArah] = React.useState<'masuk' | 'keluar'>('masuk');
  const q = useDibagikanBerkas(arah);
  const [pesan, setPesan] = React.useState<string | null>(null);
  const daftar = q.data?.dibagikan ?? [];
  const cabut = async (x: BagiBerkas) => {
    try {
      await siakad.request({ method: 'POST', path: `/v1/berkas/bagikan/${encodeURIComponent(x.id)}/cabut` });
      invalidateSiakad('berkas-dibagikan');
    } catch (e) {
      setPesan(pesanGalat(e));
    }
  };
  const salinKeSaya = async (x: BagiBerkas) => {
    if (!x.berkas) return;
    try {
      await aksi.salinBerkas([x.berkas.id], null, { unit: null });
      setPesan(`${x.berkas.nama} disalin ke Berkas saya.`);
    } catch (e) {
      setPesan(pesanGalat(e));
    }
  };
  return (
    <section className="u-db-bagi" aria-label="Dibagikan">
      <div className="u-db-bagi-kepala">
        <SegmentedControl<'masuk' | 'keluar'>
          aria-label="Arah berbagi"
          value={arah}
          onValueChange={setArah}
          options={[
            { value: 'masuk', label: 'Dibagikan ke saya' },
            { value: 'keluar', label: 'Yang saya bagikan' },
          ]}
        />
        {pesan && (
          <span className="u-db-bagi-pesan" role="status">
            {pesan}
          </span>
        )}
      </div>
      {q.loading && !q.data ? (
        <span className="u-skeleton u-db-bagi-muat" aria-label="Memuat" />
      ) : q.error ? (
        <p className="u-field-error">{pesanGalat(q.error)}</p>
      ) : !daftar.length ? (
        <div className="u-mb-kosong">
          <Inbox aria-hidden />
          <b>{arah === 'masuk' ? 'Belum ada yang dibagikan ke Anda' : 'Anda belum membagikan apa pun'}</b>
          <p>{arah === 'masuk' ? 'Berkas dan folder yang dibagikan rekan atau unit Anda tampil di sini.' : 'Pilih Bagikan dari menu berkas atau folder untuk membagikannya ke orang, unit, atau tautan publik.'}</p>
        </div>
      ) : (
        <ul className="u-db-bagi-daftar">
          {daftar.map((x) => {
            const nama = x.jenis === 'folder' ? (x.folder?.nama ?? '') : (x.berkas?.nama ?? '');
            return (
              <li key={x.id}>
                {x.jenis === 'folder' ? <FolderOpen aria-hidden /> : <Share2 aria-hidden />}
                <span className="u-db-bagi-teks">
                  <b title={nama}>{nama}</b>
                  <small>
                    {arah === 'masuk'
                      ? [asal(x), x.ke_jenis === 'unit' ? `lewat ${x.ke_nama ?? x.ke}` : null, x.berkas ? formatBytes(x.berkas.ukuran) : null, x.kedaluwarsa_at ? `sampai ${formatDate(x.kedaluwarsa_at, 'short')}` : null]
                          .filter(Boolean)
                          .join(' · ')
                      : [
                          x.ke_jenis === 'tautan' ? `Tautan publik · ${x.jumlah_akses ?? 0}× dibuka` : `ke ${x.ke_nama ?? x.ke}`,
                          x.kedaluwarsa_at ? `sampai ${formatDate(x.kedaluwarsa_at, 'short')}` : null,
                        ]
                          .filter(Boolean)
                          .join(' · ')}
                  </small>
                </span>
                <Badge variant={x.izin === 'ubah' ? 'info' : 'neutral'}>
                  {x.ke_jenis === 'tautan' ? <Globe aria-hidden /> : x.ke_jenis === 'unit' ? <Building2 aria-hidden /> : <UserRound aria-hidden />}
                  {x.izin === 'ubah' ? 'Bisa ubah' : 'Lihat'}
                </Badge>
                {arah === 'masuk' ? (
                  x.jenis === 'folder' ? (
                    <Button variant="outline" size="sm" onClick={() => bukaFolder?.(x.id, nama)}>
                      <FolderOpen aria-hidden />
                      Buka
                    </Button>
                  ) : (
                    x.berkas && (
                      <>
                        <Button variant="ghost" size="sm" iconOnly aria-label={`Salin ${nama} ke Berkas saya`} onClick={() => void salinKeSaya(x)}>
                          <CopyPlus aria-hidden />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => x.berkas && aksi.unduh(x.berkas).catch((e) => setPesan(pesanGalat(e)))}>
                          <Download aria-hidden />
                          Unduh
                        </Button>
                      </>
                    )
                  )
                ) : (
                  <Button variant="ghost" size="sm" onClick={() => void cabut(x)}>
                    <Trash2 aria-hidden />
                    Cabut
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
