'use client';
import * as React from 'react';
import { CheckCheck, FileText, Send } from 'lucide-react';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Card, CardContent, CardHeader, DescriptionList } from '../components/display';
import { Field, Input, SegmentedControl, Textarea } from '../components/forms';
import { DaftarKegiatanBkd, RingkasanBebanBkd, sksBkd, type BidangBkd, type KegiatanBkd } from './bkd';

/*
 * Penilaian BKD oleh asesor eksternal lewat tautan bertoken (SIAKAD GET/POST /v1/sdm/bkd/tamu/{token}, docs/BKD.md).
 * Tidak memakai SDK/sesi login: aplikasi meneruskan permintaan lewat BFF publik (mis. `/bff/publik`) yang hanya
 * mengizinkan rute tamu BKD. POST membawa token CSRF sesi peramban dari `csrf()`.
 */

interface DataTamu {
  asesor_ke: number;
  asesor: { nama: string; pt_asal: string | null } | null;
  kedaluwarsa_at: string | null;
  sudah_dikirim: boolean;
  boleh_nilai: boolean;
  periode: { nama: string; penilaian_selesai: string | null };
  pegawai: { nama: string; nidn: string | null; prodi: string | null; jabatan_akademik: string | null };
  aturan: { bidang: { kode: string; nama: string }[]; kategori: { kode: string; nama: string }[] };
  hasil: { bidang: BidangBkd[]; dasar_total: number; minimal: number | null; maksimal: number | null; dasar: string };
  item: (KegiatanBkd & { file?: { uuid: string; nama: string }[] })[];
}

const tgl = (s?: string | null) => (s ? new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(s.replace(' ', 'T'))) : '-');
const angka = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export interface PenilaianBkdTamuProps {
  token: string;
  /** Awalan BFF publik, bawaan `/bff/publik`. */
  basis?: string;
  /** Token CSRF sesi peramban (mis. dari GET /bff/sesi). */
  csrf: () => Promise<string>;
  className?: string;
}

/** Halaman penilaian asesor eksternal: identitas dosen, beban, kegiatan + bukti, M/TM per kegiatan, simpan/kirim. */
export function PenilaianBkdTamu({ token, basis = '/bff/publik', csrf, className }: PenilaianBkdTamuProps) {
  const alamat = `${basis}/v1/sdm/bkd/tamu/${encodeURIComponent(token)}`;
  const [d, setD] = React.useState<DataTamu | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [pesan, setPesan] = React.useState<string | null>(null);
  const [nilai, setNilai] = React.useState<Record<number, { hasil: 'M' | 'TM' | null; sks: string; catatan: string }>>({});
  const [catatan, setCatatan] = React.useState('');
  const [sibuk, setSibuk] = React.useState<null | 'simpan' | 'kirim'>(null);

  const pakai = React.useCallback((x: DataTamu) => {
    setD(x);
    setNilai(
      Object.fromEntries(
        x.item.map((i) => {
          const n = i.nilai_asesor?.[0];
          return [i.id, { hasil: n?.hasil ?? null, sks: String(n?.sks_diakui ?? i.sks_realisasi ?? i.sks_rencana ?? ''), catatan: n?.catatan ?? '' }];
        }),
      ),
    );
  }, []);

  React.useEffect(() => {
    fetch(alamat, { headers: { Accept: 'application/json' }, credentials: 'same-origin' })
      .then(async (r) => {
        const j = await r.json().catch(() => null);
        if (!r.ok) throw new Error(j?.error?.message ?? 'Tautan tidak bisa dibuka.');
        pakai(j.data as DataTamu);
      })
      .catch((e: Error) => setGalat(e.message));
  }, [alamat, pakai]);

  const kirim = async (selesai: boolean) => {
    if (!d) return;
    const belum = d.item.filter((i) => !nilai[i.id]?.hasil).length;
    if (selesai && belum) return setPesan(`Masih ada ${belum} kegiatan yang belum dinilai.`);
    if (d.item.some((i) => nilai[i.id]?.hasil === 'TM' && !nilai[i.id]?.catatan.trim())) return setPesan('Catatan wajib diisi untuk setiap kegiatan TM.');
    setSibuk(selesai ? 'kirim' : 'simpan');
    setPesan(null);
    try {
      const r = await fetch(alamat, {
        method: 'POST',
        credentials: 'same-origin',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': await csrf() },
        body: JSON.stringify({
          item: d.item.filter((i) => nilai[i.id]?.hasil).map((i) => ({ id: i.id, hasil: nilai[i.id]!.hasil, sks_diakui: nilai[i.id]!.hasil === 'M' ? angka(nilai[i.id]!.sks) : null, catatan: nilai[i.id]!.catatan.trim() || null })),
          catatan: catatan.trim() || null,
          selesai,
        }),
      });
      const j = await r.json().catch(() => null);
      if (!r.ok) throw new Error(j?.error?.message ?? 'Penilaian belum tersimpan.');
      pakai(j.data as DataTamu);
      setPesan(selesai ? 'Penilaian terkirim. Terima kasih.' : 'Penilaian tersimpan sementara.');
    } catch (e) {
      setPesan((e as Error).message);
    } finally {
      setSibuk(null);
    }
  };

  if (galat) return <Alert variant="danger" title="Tautan penilaian tidak bisa dibuka" className={className}>{galat}</Alert>;
  if (!d) return <Skeleton style={{ height: 360 }} />;
  const kat = Object.fromEntries(d.aturan.kategori.map((k) => [k.kode, k.nama]));
  const diakui = d.item.reduce((s, i) => s + (nilai[i.id]?.hasil === 'M' ? Number(angka(nilai[i.id]!.sks) ?? 0) : 0), 0);
  return (
    <div className={['u-bkd-laporan', className].filter(Boolean).join(' ')}>
      <Card>
        <CardContent>
          <div className="u-bkd-kepala">
            <div>
              <p className="u-bkd-label">Penilaian BKD sebagai asesor {d.asesor_ke} · {d.periode.nama}</p>
              <h3 className="u-bkd-judul">{d.pegawai.nama}</h3>
              <p className="u-bkd-keterangan">{[d.pegawai.nidn ? `NIDN ${d.pegawai.nidn}` : null, d.pegawai.prodi, d.pegawai.jabatan_akademik].filter(Boolean).join(' · ')}</p>
            </div>
            <Badge variant={d.sudah_dikirim ? 'success' : 'warning'} dot>
              {d.sudah_dikirim ? 'Penilaian terkirim' : 'Menunggu penilaian Anda'}
            </Badge>
          </div>
          <DescriptionList
            items={[
              { label: 'Asesor', value: `${d.asesor?.nama ?? '-'}${d.asesor?.pt_asal ? ` (${d.asesor.pt_asal})` : ''}` },
              { label: 'Batas penilaian', value: tgl(d.periode.penilaian_selesai) },
              { label: 'Tautan berlaku sampai', value: tgl(d.kedaluwarsa_at) },
            ]}
          />
        </CardContent>
      </Card>
      {pesan ? <Alert variant={/terkirim|tersimpan/.test(pesan) ? 'success' : 'warning'}>{pesan}</Alert> : null}
      <Card>
        <CardContent>
          <RingkasanBebanBkd bidang={d.hasil.bidang} total={d.hasil.dasar_total} minimal={d.hasil.minimal} maksimal={d.hasil.maksimal} dasar={d.hasil.dasar} judul="Klaim dosen" />
        </CardContent>
      </Card>
      <Card>
        <CardHeader title="Kegiatan" description={d.boleh_nilai ? 'Nilai setiap kegiatan memenuhi (M) atau tidak memenuhi (TM); catatan wajib untuk TM.' : 'Penilaian Anda sudah terkirim.'} />
        <CardContent>
          {d.boleh_nilai ? (
            <div className="u-bkd-aksi" style={{ marginTop: 0, marginBottom: '0.75rem' }}>
              <Button size="sm" variant="outline" onClick={() => setNilai(Object.fromEntries(d.item.map((i) => [i.id, { ...nilai[i.id]!, hasil: nilai[i.id]?.hasil ?? 'M' }])))}>
                <CheckCheck /> Tandai yang belum sebagai M
              </Button>
            </div>
          ) : null}
          <DaftarKegiatanBkd
            bidang={d.aturan.bidang}
            kegiatan={d.item.map((i) => ({ ...i, file: undefined }))}
            kategori={kat}
            dasar="realisasi"
            sisipan={(k) => {
              const it = d.item.find((x) => x.id === k.id);
              const v = nilai[k.id] ?? { hasil: null, sks: '', catatan: '' };
              const ubah = (x: Partial<typeof v>) => setNilai({ ...nilai, [k.id]: { ...v, ...x } });
              return (
                <>
                  {it?.file?.length ? (
                    <p className="u-bkd-bukti" style={{ padding: '0 0.875rem 0.5rem' }}>
                      {it.file.map((f) => (
                        <a key={f.uuid} href={`${alamat}/berkas/${encodeURIComponent(f.uuid)}?inline=1`} target="_blank" rel="noreferrer">
                          <FileText aria-hidden /> {f.nama}
                        </a>
                      ))}
                    </p>
                  ) : null}
                  {d.boleh_nilai ? (
                    <div className="u-bkd-nilai" data-hasil={v.hasil ?? ''}>
                      <SegmentedControl aria-label={`Penilaian ${k.kegiatan}`} options={[{ value: 'M', label: 'Memenuhi (M)' }, { value: 'TM', label: 'Tidak memenuhi (TM)' }]} value={v.hasil ?? undefined} onValueChange={(x) => ubah({ hasil: x as 'M' | 'TM' })} />
                      <Input aria-label="SKS diakui" inputMode="decimal" value={v.sks} disabled={v.hasil !== 'M'} onChange={(e) => ubah({ sks: e.target.value })} />
                      <Input aria-label="Catatan" value={v.catatan} onChange={(e) => ubah({ catatan: e.target.value })} placeholder={v.hasil === 'TM' ? 'Alasan TM (wajib)' : 'Catatan (opsional)'} />
                    </div>
                  ) : null}
                </>
              );
            }}
          />
          {d.boleh_nilai ? (
            <div className="u-bkd-form" style={{ marginTop: '1rem' }}>
              <Field label="Catatan umum untuk dosen" optional>
                <Textarea rows={3} value={catatan} onChange={(e) => setCatatan(e.target.value)} />
              </Field>
              <div className="u-bkd-kaki">
                <p className="u-bkd-keterangan">
                  {d.item.filter((i) => nilai[i.id]?.hasil).length} dari {d.item.length} dinilai · diakui {sksBkd(diakui)}
                </p>
                <Button variant="outline" loading={sibuk === 'simpan'} onClick={() => void kirim(false)}>
                  Simpan sementara
                </Button>
                <Button loading={sibuk === 'kirim'} onClick={() => void kirim(true)}>
                  <Send /> Kirim penilaian
                </Button>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
