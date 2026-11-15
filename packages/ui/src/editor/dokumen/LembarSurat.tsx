import * as React from 'react';
import { cn } from '../../lib/cn';
import { saringHtml } from './saring';
import { tanggalSurat } from './templat';

export type UkuranKertas = 'a4' | 'f4' | 'letter';

/** Kop surat: logo, nama instansi, unit, dan alamat. */
export interface KopSurat {
  logo?: string;
  instansi: string;
  /** Unit pengirim, mis. "Fakultas Teknik". */
  unit?: string;
  alamat?: string;
  /** Telepon, surel, situs dalam satu baris. */
  kontak?: string;
}

export interface TujuanSurat {
  nama: string;
  jabatan?: string | null;
  instansi?: string | null;
  alamat?: string | null;
  tembusan?: boolean;
}

export interface PenandatanganSurat {
  jabatan: string;
  nama: string;
  /** NIP/NIDN/NIK, ditulis apa adanya, mis. "NIDN 0912078501". */
  nomorInduk?: string;
  /** Gambar tanda tangan atau QR tanda tangan elektronik. */
  ttd?: string;
  /** Tautan cek keaslian (GET /v1/arsip/verifikasi/{kode}); tampil di bawah tanda tangan. */
  verifikasi?: string;
}

export interface LembarSuratProps {
  kop?: KopSurat | React.ReactNode;
  nomor?: string | null;
  lampiran?: string | null;
  perihal?: string | null;
  sifat?: string | null;
  /** Tanggal surat (YYYY-MM-DD) atau teks jadi. */
  tanggal?: string | Date | null;
  /** Tempat di depan tanggal, mis. "Marisa". */
  tempat?: string;
  tujuan?: TujuanSurat[] | React.ReactNode;
  /** Isi surat (HTML). Disaring seperti server sebelum ditampilkan. */
  isi: string;
  penandatangan?: PenandatanganSurat;
  /** Daftar tembusan; tanpa ini diambil dari `tujuan` yang bertanda tembusan. */
  tembusan?: string[];
  kertas?: UkuranKertas;
  /** Tampilkan bayangan kertas di layar (bawaan true). Saat dicetak selalu polos. */
  bayangan?: boolean;
  className?: string;
}

const kopObjek = (k: LembarSuratProps['kop']): k is KopSurat => Boolean(k && typeof k === 'object' && 'instansi' in (k as object));

/**
 * Satu lembar surat dinas siap cetak: kop, nomor/lampiran/perihal, tanggal, tujuan, isi, tanda tangan, dan
 * tembusan. Ukuran kertas A4/F4/Letter dengan margin surat dinas; `window.print()` mencetak lembarnya saja bila
 * dibungkus `.u-cetak-saja` (lihat dokumentasi).
 */
export function LembarSurat({ kop, nomor, lampiran, perihal, sifat, tanggal, tempat, tujuan, isi, penandatangan, tembusan, kertas = 'a4', bayangan = true, className }: LembarSuratProps) {
  const html = React.useMemo(() => saringHtml(isi), [isi]);
  const daftarTujuan = Array.isArray(tujuan) ? (tujuan as TujuanSurat[]) : null;
  const utama = daftarTujuan?.filter((t) => !t.tembusan) ?? [];
  const salinan = tembusan ?? daftarTujuan?.filter((t) => t.tembusan).map((t) => [t.jabatan, t.nama].filter(Boolean).join(' ') || t.nama) ?? [];
  const tgl = tanggal === undefined ? null : typeof tanggal === 'string' && !/^\d{4}-\d{2}-\d{2}/.test(tanggal) ? tanggal : tanggalSurat(tanggal);

  return (
    <article className={cn('u-lembar', className)} data-kertas={kertas} data-bayangan={bayangan || undefined}>
      {kop &&
        (kopObjek(kop) ? (
          <header className="u-lembar-kop">
            {kop.logo && <img src={kop.logo} alt="" className="u-lembar-logo" />}
            <div>
              <p className="u-lembar-instansi">{kop.instansi}</p>
              {kop.unit && <p className="u-lembar-unit">{kop.unit}</p>}
              {kop.alamat && <p className="u-lembar-alamat">{kop.alamat}</p>}
              {kop.kontak && <p className="u-lembar-alamat">{kop.kontak}</p>}
            </div>
          </header>
        ) : (
          <header className="u-lembar-kop">{kop as React.ReactNode}</header>
        ))}

      {(nomor || perihal || tgl) && (
        <div className="u-lembar-kepala">
          <table className="u-lembar-meta">
            <tbody>
              {nomor !== undefined && (
                <tr>
                  <th scope="row">Nomor</th>
                  <td>: {nomor || '…'}</td>
                </tr>
              )}
              {sifat && (
                <tr>
                  <th scope="row">Sifat</th>
                  <td>: {sifat}</td>
                </tr>
              )}
              {lampiran !== undefined && (
                <tr>
                  <th scope="row">Lampiran</th>
                  <td>: {lampiran || '-'}</td>
                </tr>
              )}
              {perihal !== undefined && (
                <tr>
                  <th scope="row">Perihal</th>
                  <td>
                    : <strong>{perihal || '…'}</strong>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          {tgl && <p className="u-lembar-tanggal">{[tempat, tgl].filter(Boolean).join(', ')}</p>}
        </div>
      )}

      {tujuan && (
        <div className="u-lembar-tujuan">
          <p>Yth.</p>
          {daftarTujuan
            ? utama.map((t, i) => (
                <p key={`${t.nama}-${i}`}>
                  {[t.jabatan, t.nama].filter(Boolean).join(' ')}
                  {t.instansi && <br />}
                  {t.instansi}
                  {t.alamat && <br />}
                  {t.alamat}
                </p>
              ))
            : (tujuan as React.ReactNode)}
        </div>
      )}

      <div className="u-lembar-isi ub-konten" dangerouslySetInnerHTML={{ __html: html }} />

      {penandatangan && (
        <div className="u-lembar-ttd">
          <p>{penandatangan.jabatan},</p>
          <div className="u-lembar-ttd-ruang">{penandatangan.ttd ? <img src={penandatangan.ttd} alt={`Tanda tangan ${penandatangan.nama}`} /> : null}</div>
          <p className="u-lembar-ttd-nama">{penandatangan.nama}</p>
          {penandatangan.nomorInduk && <p>{penandatangan.nomorInduk}</p>}
          {penandatangan.verifikasi && <p className="u-lembar-verifikasi">Cek keaslian: {penandatangan.verifikasi}</p>}
        </div>
      )}

      {salinan.length > 0 && (
        <div className="u-lembar-tembusan">
          <p>Tembusan:</p>
          <ol>
            {salinan.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ol>
        </div>
      )}
    </article>
  );
}
