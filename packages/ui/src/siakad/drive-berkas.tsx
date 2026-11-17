'use client';
import * as React from 'react';
import { Building2, CopyPlus, Download, FolderOpen, Globe, HardDrive, Inbox, Share2, Trash2, UserRound, Users } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { SegmentedControl } from '../components/forms';
import { cn } from '../lib/cn';
import { formatBytes, formatDate } from '../lib/format';
import { useDibagikanBerkas, useUnitBerkas, type BagiBerkas } from './berkas-ruang';
import { ManajerBerkas, useAksiBerkas, type ManajerBerkasProps } from './manajer-berkas';
import { invalidateSiakad, pesanGalat, useSiakad } from './provider';

export interface DriveBerkasProps extends Omit<ManajerBerkasProps, 'unit' | 'bagi' | 'judul'> {
  /** Ruang yang dibuka pertama kali: "saya", kode unit, atau "dibagikan". Bawaan unit pertama dari `unitTampil`, selain itu "saya". */
  ruangAwal?: string;
  /** Batasi unit yang tampil (mis. ["bauk"] di aplikasi BAUK). Kosong = semua unit yang bisa dibuka pengguna. */
  unitTampil?: string[];
  /** Tampilkan "Berkas saya" (bawaan true). */
  tampilPribadi?: boolean;
  /** Tampilkan "Dibagikan" (bawaan true). */
  tampilDibagikan?: boolean;
}

type Pilihan = { jenis: 'saya' } | { jenis: 'unit'; kode: string } | { jenis: 'dibagikan' } | { jenis: 'bagi'; id: string; nama: string };

/**
 * Penyimpanan berkas lengkap: berkas pribadi, ruang bersama setiap unit yang bisa dibuka pengguna (BAAK, BAUK, SDM, LPM,
 * PMB, LPPM, fakultas, ...), dan berkas/folder yang dibagikan ke pengguna. Tiap ruang memakai ManajerBerkas.
 */
export function DriveBerkas({ ruangAwal, unitTampil, tampilPribadi = true, tampilDibagikan = true, className, tinggi = '40rem', ...props }: DriveBerkasProps) {
  const unitQ = useUnitBerkas(false);
  const unit = (unitQ.data?.unit ?? []).filter((u) => !unitTampil?.length || unitTampil.includes(u.kode));
  const awal = (): Pilihan =>
    ruangAwal === 'dibagikan' ? { jenis: 'dibagikan' } : ruangAwal && ruangAwal !== 'saya' ? { jenis: 'unit', kode: ruangAwal } : unitTampil?.[0] ? { jenis: 'unit', kode: unitTampil[0] } : { jenis: 'saya' };
  const [pilih, setPilih] = React.useState<Pilihan>(awal);
  // Bila unit yang diminta tidak bisa dibuka pengguna, kembali ke ruang pribadi.
  React.useEffect(() => {
    if (pilih.jenis === 'unit' && unitQ.data && !unit.some((u) => u.kode === pilih.kode)) setPilih(tampilPribadi ? { jenis: 'saya' } : { jenis: 'dibagikan' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unitQ.data]);
  const kunci = pilih.jenis === 'unit' ? `unit:${pilih.kode}` : pilih.jenis === 'bagi' ? `bagi:${pilih.id}` : pilih.jenis;

  return (
    <div className={cn('u-db', className)}>
      <nav className="u-db-ruang" aria-label="Ruang berkas">
        {tampilPribadi && (
          <button type="button" aria-current={pilih.jenis === 'saya' ? 'page' : undefined} onClick={() => setPilih({ jenis: 'saya' })}>
            <HardDrive aria-hidden />
            Berkas saya
          </button>
        )}
        {unit.map((u) => (
          <button key={u.kode} type="button" aria-current={pilih.jenis === 'unit' && pilih.kode === u.kode ? 'page' : undefined} onClick={() => setPilih({ jenis: 'unit', kode: u.kode })} title={u.nama}>
            <Building2 aria-hidden />
            {u.singkatan || u.nama}
            {u.akses === 'kelola' && <small>pengelola</small>}
          </button>
        ))}
        {unitQ.loading && !unitQ.data && (
          <span className="u-db-ruang-muat" role="status" aria-label="Memuat unit">
            <i className="u-skeleton" />
            <i className="u-skeleton" />
          </span>
        )}
        {tampilDibagikan && (
          <button type="button" aria-current={pilih.jenis === 'dibagikan' || pilih.jenis === 'bagi' ? 'page' : undefined} onClick={() => setPilih({ jenis: 'dibagikan' })}>
            <Users aria-hidden />
            Dibagikan
          </button>
        )}
      </nav>
      {pilih.jenis === 'dibagikan' ? (
        <DaftarDibagikan bukaFolder={(id, nama) => setPilih({ jenis: 'bagi', id, nama })} />
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
            key={kunci}
            {...props}
            tinggi={tinggi}
            unit={pilih.jenis === 'unit' ? pilih.kode : undefined}
            bagi={pilih.jenis === 'bagi' ? pilih.id : undefined}
            judul={pilih.jenis === 'bagi' ? pilih.nama : undefined}
          />
        </>
      )}
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
