'use client';
import * as React from 'react';
import { Clock, RotateCcw, Trash2 } from 'lucide-react';
import { Badge, Button } from '../components/actions';
import { Checkbox } from '../components/forms';
import { ConfirmDialog } from '../components/overlays';
import { Select } from '../components/select';
import { formatBytes, formatDate } from '../lib/format';
import { IkonBerkasManajer, type BerkasManajer } from './manajer-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

/** Berkas di sampah (GET /v1/berkas/sampah). */
export interface BerkasSampah extends BerkasManajer {
  dihapus_at?: string | null;
  dihapus_oleh?: string | null;
  /** Kapan dihapus permanen otomatis (dari masa simpan sampah aturan penyimpanan); null = tidak otomatis. */
  hapus_otomatis_at?: string | null;
}

export interface MetaSampah {
  total: number;
  /** Masa simpan sampah (hari) ruang ini; null = tidak dikosongkan otomatis. */
  sampah_hari: number | null;
  ukuran_total: number;
  unit: string | null;
}

/** Isi sampah ruang pribadi (`unit` kosong) atau ruang unit (pengelola: semua; anggota: yang ia unggah). */
export function useSampahBerkas(unit?: string | null, enabled = true) {
  return useSiakadQuery<BerkasSampah[]>(
    ['berkas-sampah', unit ?? ''],
    (s, signal) => s.request<BerkasSampah[]>({ method: 'GET', path: '/v1/berkas/sampah', query: { per_page: 200, ...(unit ? { unit } : {}) } }, { signal }),
    { enabled, staleTime: 0 },
  );
}

export interface DaftarSampahProps {
  /** Ruang yang bisa dipilih: Berkas saya (unit null) dan unit yang dikelola/diikuti. */
  ruang: Array<{ unit: string | null; nama: string }>;
  ruangAwal?: string | null;
}

/**
 * Sampah berkas: berkas yang dipindahkan ke Sampah dari ruang pribadi atau ruang unit. Pulihkan (kembali ke folder
 * asalnya), hapus permanen (konfirmasi tegas), atau kosongkan sampah. Keterangan masa simpan dari aturan penyimpanan.
 */
export function DaftarSampah({ ruang, ruangAwal = null }: DaftarSampahProps) {
  const siakad = useSiakad();
  const [unit, setUnit] = React.useState<string | null>(ruangAwal);
  const q = useSampahBerkas(unit);
  const [pilih, setPilih] = React.useState<Set<string>>(() => new Set());
  const [tanya, setTanya] = React.useState<null | { jenis: 'permanen'; berkas: BerkasSampah[] } | { jenis: 'kosongkan' }>(null);
  const [pesan, setPesan] = React.useState<{ nada: 'sukses' | 'galat'; teks: string } | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const daftar = q.data ?? [];
  const meta = q.meta as unknown as MetaSampah | undefined;
  React.useEffect(() => setPilih(new Set()), [unit]);

  const segarkan = () => {
    invalidateSiakad('berkas-sampah');
    invalidateSiakad('berkas-isi');
    invalidateSiakad('berkas-folder');
    invalidateSiakad('berkas-info');
    invalidateSiakad('penyimpanan');
  };
  const jalankan = async (path: string, body: Record<string, unknown>, sukses: (d: Record<string, unknown>) => string) => {
    setSibuk(true);
    try {
      const r = await siakad.request<Record<string, unknown>>({ method: 'POST', path, body });
      const gagal = (r.data.gagal as Array<{ pesan: string }> | undefined) ?? [];
      setPesan(gagal.length ? { nada: 'galat', teks: `${sukses(r.data)} ${gagal.length} gagal: ${gagal[0].pesan}` } : { nada: 'sukses', teks: sukses(r.data) });
      setPilih(new Set());
      segarkan();
    } catch (e) {
      setPesan({ nada: 'galat', teks: pesanGalat(e) });
    } finally {
      setSibuk(false);
    }
  };
  const pulihkan = (id: string[]) =>
    jalankan('/v1/berkas/sampah/pulihkan', { id }, (d) => `${(d.dipulihkan as string[]).length} berkas dikembalikan ke tempat asalnya.`);
  const hapusPermanen = (id: string[]) =>
    jalankan('/v1/berkas/sampah/hapus-permanen', { id }, (d) => `${(d.dihapus as string[]).length} berkas dihapus permanen.`);
  const kosongkan = () =>
    jalankan('/v1/berkas/sampah/kosongkan', unit ? { unit } : {}, (d) => `Sampah dikosongkan: ${d.dihapus as number} berkas (${formatBytes(Number(d.ukuran ?? 0))}).`);

  const terpilih = daftar.filter((b) => pilih.has(b.id));
  const alih = (id: string) =>
    setPilih((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section className="u-sampah" aria-label="Sampah">
      <div className="u-sampah-kepala">
        <div className="u-sampah-judul">
          <Trash2 aria-hidden />
          <div>
            <h3>Sampah</h3>
            <p>
              {meta?.sampah_hari
                ? `Berkas di Sampah dihapus permanen otomatis setelah ${meta.sampah_hari} hari.`
                : 'Berkas di Sampah tidak dihapus otomatis. Hapus permanen untuk mengosongkan ruang.'}{' '}
              Sampah tidak mengurangi kuota.
            </p>
          </div>
        </div>
        <div className="u-sampah-alat">
          {ruang.length > 1 && (
            <Select<string>
              size="sm"
              aria-label="Ruang"
              options={ruang.map((r) => ({ value: r.unit ?? '', label: r.nama }))}
              value={unit ?? ''}
              onValueChange={(v) => setUnit(v ? v : null)}
            />
          )}
          <Button variant="outline" size="sm" className="u-mb-bahaya" disabled={!daftar.length || sibuk} onClick={() => setTanya({ jenis: 'kosongkan' })}>
            <Trash2 aria-hidden />
            Kosongkan sampah
          </Button>
        </div>
      </div>

      {terpilih.length > 0 && (
        <div className="u-sampah-pilih" role="toolbar" aria-label="Berkas terpilih">
          <span>{terpilih.length} dipilih</span>
          <Button variant="ghost" size="sm" disabled={sibuk} onClick={() => void pulihkan(terpilih.map((b) => b.id))}>
            <RotateCcw aria-hidden />
            Pulihkan
          </Button>
          <Button variant="ghost" size="sm" className="u-mb-bahaya" disabled={sibuk} onClick={() => setTanya({ jenis: 'permanen', berkas: terpilih })}>
            <Trash2 aria-hidden />
            Hapus permanen
          </Button>
        </div>
      )}

      {pesan && (
        <p className="u-sampah-pesan" data-nada={pesan.nada} role={pesan.nada === 'galat' ? 'alert' : 'status'}>
          {pesan.teks}
        </p>
      )}

      {q.loading && !q.data ? (
        <div className="u-sampah-muat" aria-busy>
          {[0, 1, 2].map((i) => (
            <span key={i} className="u-skeleton" />
          ))}
        </div>
      ) : q.error ? (
        <p className="u-field-error">{pesanGalat(q.error)}</p>
      ) : !daftar.length ? (
        <div className="u-mb-kosong">
          <Trash2 aria-hidden />
          <b>Sampah kosong</b>
          <p>Berkas yang Anda hapus pindah ke sini dan masih bisa dipulihkan.</p>
        </div>
      ) : (
        <>
          <ul className="u-sampah-daftar">
            {daftar.map((b) => (
              <li key={b.id} data-pilih={pilih.has(b.id) ? '' : undefined}>
                <Checkbox checked={pilih.has(b.id)} onCheckedChange={() => alih(b.id)} aria-label={`Pilih ${b.nama}`} />
                <span className="u-sampah-ikon" aria-hidden>
                  <IkonBerkasManajer b={b} />
                </span>
                <span className="u-sampah-teks">
                  <b title={b.nama}>{b.nama}</b>
                  <small>
                    {[
                      formatBytes(b.ukuran),
                      b.folder ? `dari ${b.folder}` : 'dari folder utama',
                      b.dihapus_at ? `dihapus ${formatDate(b.dihapus_at, 'short')}` : null,
                      b.dihapus_oleh && b.dihapus_oleh !== b.pemilik ? `oleh ${b.dihapus_oleh}` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </span>
                {b.hapus_otomatis_at && (
                  <Badge variant="neutral" title="Dihapus permanen otomatis pada tanggal ini">
                    <Clock aria-hidden />
                    {formatDate(b.hapus_otomatis_at, 'short')}
                  </Badge>
                )}
                <Button variant="ghost" size="sm" disabled={sibuk} onClick={() => void pulihkan([b.id])}>
                  <RotateCcw aria-hidden />
                  Pulihkan
                </Button>
                <Button variant="ghost" size="sm" iconOnly className="u-mb-bahaya" aria-label={`Hapus permanen ${b.nama}`} title="Hapus permanen" disabled={sibuk} onClick={() => setTanya({ jenis: 'permanen', berkas: [b] })}>
                  <Trash2 aria-hidden />
                </Button>
              </li>
            ))}
          </ul>
          <p className="u-sampah-kaki">
            {meta ? `${meta.total} berkas · ${formatBytes(meta.ukuran_total)}` : ''}
          </p>
        </>
      )}

      <ConfirmDialog
        open={tanya !== null}
        onOpenChange={(o) => !o && setTanya(null)}
        title={
          tanya?.jenis === 'kosongkan'
            ? 'Kosongkan sampah?'
            : tanya?.jenis === 'permanen'
              ? tanya.berkas.length === 1
                ? `Hapus permanen ${tanya.berkas[0].nama}?`
                : `Hapus permanen ${tanya.berkas.length} berkas?`
              : ''
        }
        description={
          tanya?.jenis === 'kosongkan'
            ? `Semua ${meta?.total ?? daftar.length} berkas di Sampah${unit ? ` ${ruang.find((r) => r.unit === unit)?.nama ?? ''}` : ''} (${formatBytes(meta?.ukuran_total ?? 0)}) dihapus selamanya beserta isinya. Tindakan ini tidak bisa dibatalkan.`
            : 'Isi berkas ikut dihapus dari penyimpanan dan tidak bisa dipulihkan lagi. Tindakan ini tidak bisa dibatalkan.'
        }
        confirmLabel={tanya?.jenis === 'kosongkan' ? 'Kosongkan sampah' : 'Hapus permanen'}
        onConfirm={async () => {
          const t = tanya;
          setTanya(null);
          if (t?.jenis === 'kosongkan') await kosongkan();
          else if (t?.jenis === 'permanen') await hapusPermanen(t.berkas.map((b) => b.id));
        }}
      />
    </section>
  );
}
