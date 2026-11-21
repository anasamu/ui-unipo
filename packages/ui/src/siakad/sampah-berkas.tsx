'use client';
import * as React from 'react';
import { Lock, RotateCcw, Trash2 } from 'lucide-react';
import { Button } from '../components/actions';
import { Checkbox } from '../components/forms';
import { Tooltip } from '../components/overlays';
import { ConfirmDialog } from '../components/overlays';
import { Select } from '../components/select';
import { formatBytes, formatDate } from '../lib/format';
import { IkonBerkasManajer, type BerkasManajer } from './manajer-berkas';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';
import { useAkunSaya } from './akun';
import { SegmentedControl } from '../components/forms';

/** Berkas di sampah (GET /v1/berkas/sampah). */
export interface BerkasSampah extends BerkasManajer {
  dihapus_at?: string | null;
  dihapus_oleh?: string | null;
  /** Boleh dihapus permanen pemanggil? Tidak untuk arsip institusi, berkas yang masih dirujuk modul, dan berkas sensitif. */
  permanen?: { boleh: boolean; alasan: string | null };
}

export interface MetaSampah {
  total: number;
  ukuran_total: number;
  unit: string | null;
  /** Sampah tidak pernah dihapus otomatis. */
  hapus_otomatis?: boolean;
  /** Admin Pustikom: boleh mengosongkan sampah. */
  boleh_kosongkan?: boolean;
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
 * Sampah berkas: berkas yang dipindahkan ke Sampah dari ruang pribadi atau ruang unit. Tidak dihapus otomatis.
 * Pulihkan (kembali ke folder asalnya) atau hapus permanen berkas milik sendiri (konfirmasi tegas); arsip institusi dan
 * berkas sensitif/masih dirujuk modul tidak bisa dihapus permanen (alasannya tampil). Mengosongkan sampah hanya admin
 * Pustikom (ruang ini atau seluruh sampah).
 */
export function DaftarSampah({ ruang, ruangAwal = null }: DaftarSampahProps) {
  const siakad = useSiakad();
  const [unit, setUnit] = React.useState<string | null>(ruangAwal);
  const q = useSampahBerkas(unit);
  const [pilih, setPilih] = React.useState<Set<string>>(() => new Set());
  const [tanya, setTanya] = React.useState<null | { jenis: 'permanen'; berkas: BerkasSampah[] } | { jenis: 'kosongkan' }>(null);
  const [cakupan, setCakupan] = React.useState<'ruang' | 'semua'>('ruang');
  const saya = useAkunSaya({ foto: false }).data?.akun?.username ?? null;
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
    jalankan(
      '/v1/berkas/sampah/kosongkan',
      cakupan === 'semua' ? { semua: true } : unit ? { unit } : { pemilik: saya ?? '' },
      (d) => `Sampah dikosongkan: ${d.dihapus as number} berkas (${formatBytes(Number(d.ukuran ?? 0))})${Number(d.dilewati ?? 0) ? `; ${d.dilewati as number} dilewati (arsip atau masih dipakai)` : ''}.`,
    );

  const terpilih = daftar.filter((b) => pilih.has(b.id));
  const bolehPermanen = (b: BerkasSampah) => b.permanen?.boleh !== false;
  const terpilihPermanen = terpilih.filter(bolehPermanen);
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
            <p>Berkas di sampah tidak dihapus otomatis. Pulihkan atau hapus permanen berkas milik Anda; pengosongan sampah dilakukan admin Pustikom.</p>
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
          {meta?.boleh_kosongkan && (
            <Button variant="outline" size="sm" className="u-mb-bahaya" disabled={sibuk} onClick={() => (setCakupan('ruang'), setTanya({ jenis: 'kosongkan' }))}>
              <Trash2 aria-hidden />
              Kosongkan sampah
            </Button>
          )}
        </div>
      </div>

      {terpilih.length > 0 && (
        <div className="u-sampah-pilih" role="toolbar" aria-label="Berkas terpilih">
          <span>{terpilih.length} dipilih</span>
          <Button variant="ghost" size="sm" disabled={sibuk} onClick={() => void pulihkan(terpilih.map((b) => b.id))}>
            <RotateCcw aria-hidden />
            Pulihkan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="u-mb-bahaya"
            disabled={sibuk || !terpilihPermanen.length}
            title={terpilihPermanen.length < terpilih.length ? `${terpilih.length - terpilihPermanen.length} berkas tidak bisa dihapus permanen (lihat alasannya di daftar)` : undefined}
            onClick={() => setTanya({ jenis: 'permanen', berkas: terpilihPermanen })}
          >
            <Trash2 aria-hidden />
            Hapus permanen{terpilihPermanen.length && terpilihPermanen.length < terpilih.length ? ` (${terpilihPermanen.length})` : ''}
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
                  {!bolehPermanen(b) && b.permanen?.alasan && (
                    <small className="u-sampah-alasan">
                      <Lock aria-hidden />
                      {b.permanen.alasan}
                    </small>
                  )}
                </span>
                <Button variant="ghost" size="sm" disabled={sibuk} onClick={() => void pulihkan([b.id])}>
                  <RotateCcw aria-hidden />
                  Pulihkan
                </Button>
                {bolehPermanen(b) ? (
                  <Button variant="ghost" size="sm" iconOnly className="u-mb-bahaya" aria-label={`Hapus permanen ${b.nama}`} title="Hapus permanen" disabled={sibuk} onClick={() => setTanya({ jenis: 'permanen', berkas: [b] })}>
                    <Trash2 aria-hidden />
                  </Button>
                ) : (
                  <Tooltip content={b.permanen?.alasan ?? 'Tidak bisa dihapus permanen'}>
                    <Button variant="ghost" size="sm" iconOnly aria-label={`Hapus permanen ${b.nama} tidak tersedia: ${b.permanen?.alasan ?? ''}`} disabled>
                      <Trash2 aria-hidden />
                    </Button>
                  </Tooltip>
                )}
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
            ? cakupan === 'semua'
              ? 'SELURUH sampah semua pengguna dan unit dihapus selamanya beserta isinya, kecuali arsip institusi dan berkas yang masih dipakai modul. Tindakan ini tidak bisa dibatalkan dan tercatat di log.'
              : `Semua ${meta?.total ?? daftar.length} berkas di Sampah ${ruang.find((r) => r.unit === unit)?.nama ?? 'ruang ini'} (${formatBytes(meta?.ukuran_total ?? 0)}) dihapus selamanya beserta isinya, kecuali arsip institusi dan berkas yang masih dipakai modul. Tindakan ini tidak bisa dibatalkan dan tercatat di log.`
            : 'Isi berkas ikut dihapus dari penyimpanan dan tidak bisa dipulihkan lagi. Tindakan ini tidak bisa dibatalkan.'
        }
        confirmLabel={tanya?.jenis === 'kosongkan' ? (cakupan === 'semua' ? 'Kosongkan seluruh sampah' : 'Kosongkan sampah') : 'Hapus permanen'}
        onConfirm={async () => {
          const t = tanya;
          setTanya(null);
          if (t?.jenis === 'kosongkan') await kosongkan();
          else if (t?.jenis === 'permanen') await hapusPermanen(t.berkas.map((b) => b.id));
        }}
      >
        {tanya?.jenis === 'kosongkan' && (
          <SegmentedControl<'ruang' | 'semua'>
            aria-label="Cakupan pengosongan"
            value={cakupan}
            onValueChange={setCakupan}
            options={[
              { value: 'ruang', label: `Sampah ${ruang.find((r) => r.unit === unit)?.nama ?? 'ruang ini'}` },
              { value: 'semua', label: 'Seluruh sampah' },
            ]}
          />
        )}
      </ConfirmDialog>
    </section>
  );
}
