'use client';
import * as React from 'react';
import type { Siakad } from 'unipo-siakad-sdk';
import { ArrowLeft, Bug, CircleCheck, ListChecks, Send } from 'lucide-react';
import { Badge, Button, Skeleton, type BadgeVariant } from '../components/actions';
import { Dropzone, FileList } from '../components/calendar';
import { CopyButton } from '../components/code';
import { Alert, DescriptionList, Empty } from '../components/display';
import { Field, Input, Textarea } from '../components/forms';
import { pasangPelaporGalat, requestIdDari, type InfoGalat } from '../components/galat';
import { Sheet } from '../components/overlays';
import { formatDate, formatTime } from '../lib/format';

/*
 * Panel samping "Laporkan ke Pustikom" untuk kode laporan (request_id) di kartu/toast galat. Dipasang otomatis oleh
 * <UnipoProvider siakad>. Mengirim ke SIAKAD /v1/helpdesk/galat (docs/HELPDESK.md "Laporan bug dari kode galat"):
 * satu kode per pengguna = satu tiket; laporan ulang menambah keterangan ke tiket yang sama.
 */

type StatusTiket = 'baru' | 'diproses' | 'menunggu_pelapor' | 'selesai' | 'ditutup' | 'ditolak';
interface TiketRingkas {
  id: number;
  nomor: string;
  judul: string;
  status: StatusTiket;
  created_at: string;
  updated_at?: string | null;
  request_id?: string;
  aplikasi?: string | null;
}
interface HasilPeriksa {
  request_id: string;
  aplikasi: { kode: string; nama: string } | null;
  tiket: TiketRingkas | null;
  laporan_lain: number;
}
interface HasilKirim {
  baru: boolean;
  tiket: TiketRingkas;
  terkait?: string | null;
  pesan: string;
}

const LABEL_STATUS: Record<StatusTiket, string> = { baru: 'Baru', diproses: 'Diproses', menunggu_pelapor: 'Menunggu Anda', selesai: 'Selesai', ditutup: 'Ditutup', ditolak: 'Ditolak' };
const NADA_STATUS: Record<StatusTiket, BadgeVariant> = { baru: 'info', diproses: 'warning', menunggu_pelapor: 'secondary', selesai: 'success', ditutup: 'neutral', ditolak: 'danger' };
const MAKS_LAMPIRAN = 5 * 1024 * 1024;
/** Parameter query yang dibuang dari URL halaman (sama dengan GalatController::QUERY_RAHASIA di SIAKAD). */
const QUERY_RAHASIA = /(token|code|state|pass|sandi|secret|rahasia|key|kunci|sig|signature|session|sesi|auth|otp|nonce|ticket|tiket|jwt|bearer|credential)/i;

/** URL halaman tanpa fragmen dan tanpa parameter rahasia (token, code OAuth, sandi, tanda tangan). */
export function urlTanpaRahasia(href: string): string {
  try {
    const u = new URL(href);
    u.hash = '';
    for (const k of [...u.searchParams.keys()]) if (QUERY_RAHASIA.test(k)) u.searchParams.delete(k);
    return u.toString();
  } catch {
    return '';
  }
}

/** Ringkasan peramban dan perangkat, mis. "Chrome 141 · macOS · desktop 1440×900". */
export function ringkasPerangkat(): string {
  if (typeof navigator === 'undefined') return '';
  const ua = navigator.userAgent;
  const cocok = (re: RegExp) => re.exec(ua)?.[1]?.split('.')[0];
  const peramban = /Edg\//.test(ua)
    ? `Edge ${cocok(/Edg\/([\d.]+)/) ?? ''}`
    : /OPR\//.test(ua)
      ? `Opera ${cocok(/OPR\/([\d.]+)/) ?? ''}`
      : /Firefox\//.test(ua)
        ? `Firefox ${cocok(/Firefox\/([\d.]+)/) ?? ''}`
        : /Chrome\//.test(ua)
          ? `Chrome ${cocok(/Chrome\/([\d.]+)/) ?? ''}`
          : /Safari\//.test(ua)
            ? `Safari ${cocok(/Version\/([\d.]+)/) ?? ''}`
            : 'Peramban lain';
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad|iPod/.test(ua) ? 'iOS' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : 'OS lain';
  const jenis = /Mobi|Android|iPhone|iPod/.test(ua) ? 'ponsel' : /iPad|Tablet/.test(ua) ? 'tablet' : 'desktop';
  const layar = typeof window !== 'undefined' ? ` ${window.innerWidth}×${window.innerHeight}` : '';
  return `${peramban.trim()} · ${os} · ${jenis}${layar}`.slice(0, 200);
}

const pesanKirim = (e: unknown): string => {
  const g = e as { status?: number; message?: string; details?: Record<string, unknown> } | null;
  if (g?.status === 401 || (g?.status === 403 && (g as { code?: string }).code === 'user_token_required'))
    return 'Anda belum masuk atau sesi sudah berakhir. Masuk lalu coba lagi, atau salin kode laporan dan sampaikan ke Pustikom.';
  if (g?.status === 422 && g.details) return Object.values(g.details).map(String).join('; ') || 'Isian belum lengkap.';
  if (g?.status && g.status >= 500) {
    const id = requestIdDari(e);
    return `Laporan belum terkirim karena server sedang bermasalah. Coba lagi beberapa saat${id ? ` (kode ${id})` : ''}.`;
  }
  return g?.message || 'Laporan belum terkirim.';
};

function LencanaStatus({ status }: { status: StatusTiket }) {
  return <Badge variant={NADA_STATUS[status] ?? 'neutral'}>{LABEL_STATUS[status] ?? status}</Badge>;
}

/** Daftar laporan bug milik pengguna (GET /v1/helpdesk/galat). */
function TiketSaya({ siakad, kembali, sorot }: { siakad: Siakad; kembali: () => void; sorot?: string }) {
  const [data, setData] = React.useState<TiketRingkas[] | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  React.useEffect(() => {
    const ac = new AbortController();
    siakad
      .request<TiketRingkas[]>({ method: 'GET', path: '/v1/helpdesk/galat', query: { per_page: 20 } }, { signal: ac.signal })
      .then((r) => setData(r.data))
      .catch((e) => !ac.signal.aborted && setGalat(pesanKirim(e)));
    return () => ac.abort();
  }, [siakad]);
  return (
    <div className="u-lapor-galat">
      <Button variant="ghost" size="sm" onClick={kembali} className="u-lapor-galat-kembali">
        <ArrowLeft /> Kembali
      </Button>
      {galat ? (
        <Alert variant="danger">{galat}</Alert>
      ) : !data ? (
        <Skeleton height={160} />
      ) : data.length === 0 ? (
        <Empty icon={<ListChecks />} title="Belum ada laporan" description="Laporan bug yang Anda kirim dari kartu galat muncul di sini." />
      ) : (
        <ul className="u-lapor-galat-daftar">
          {data.map((t) => (
            <li key={t.id} data-sorot={t.nomor === sorot ? '' : undefined}>
              <span className="u-lapor-galat-daftar-judul">{t.judul}</span>
              <span className="u-lapor-galat-daftar-meta">
                <code>{t.nomor}</code> · {formatDate(t.created_at, 'medium')} {formatTime(t.created_at)}
              </span>
              <LencanaStatus status={t.status} />
            </li>
          ))}
        </ul>
      )}
      <p className="u-lapor-galat-catatan">Anda mendapat notifikasi saat Pustikom menanggapi atau mengubah status tiket.</p>
    </div>
  );
}

/**
 * Panel lapor galat. Dipasang sekali (otomatis di <UnipoProvider siakad>); tombol "Buat tiket" di <KodeLaporan /> dan
 * toast galat membukanya. Bisa juga dipasang manual: `<LaporGalat siakad={siakad} />`.
 */
export function LaporGalat({ siakad }: { siakad: Siakad }) {
  const [info, setInfo] = React.useState<(InfoGalat & { url: string; perangkat: string }) | null>(null);
  const [buka, setBuka] = React.useState(false);
  const [periksa, setPeriksa] = React.useState<HasilPeriksa | null>(null);
  const [galatPeriksa, setGalatPeriksa] = React.useState<string | null>(null);
  const [judul, setJudul] = React.useState('');
  const [uraian, setUraian] = React.useState('');
  const [berkas, setBerkas] = React.useState<File | null>(null);
  const [tolakBerkas, setTolakBerkas] = React.useState<string | null>(null);
  const [kirim, setKirim] = React.useState<{ sibuk: boolean; galat?: string; hasil?: HasilKirim }>({ sibuk: false });
  const [tampil, setTampil] = React.useState<'form' | 'saya'>('form');

  React.useEffect(
    () =>
      pasangPelaporGalat((i) => {
        setInfo({ ...i, url: urlTanpaRahasia(window.location.href), perangkat: ringkasPerangkat() });
        setPeriksa(null);
        setGalatPeriksa(null);
        setJudul('');
        setUraian('');
        setBerkas(null);
        setTolakBerkas(null);
        setKirim({ sibuk: false });
        setTampil('form');
        setBuka(true);
      }),
    [],
  );

  // Aplikasi pemanggil dan tiket yang sudah ada untuk kode ini.
  React.useEffect(() => {
    if (!buka || !info) return;
    const ac = new AbortController();
    siakad
      .request<HasilPeriksa>({ method: 'GET', path: `/v1/helpdesk/galat/${encodeURIComponent(info.requestId)}` }, { signal: ac.signal })
      .then((r) => {
        setPeriksa(r.data);
        const app = r.data.aplikasi?.nama ?? window.location.hostname;
        const halaman = (() => {
          try {
            return new URL(info.url).pathname;
          } catch {
            return '';
          }
        })();
        setJudul((j) => j || `Galat${info.status ? ` ${info.status}` : ''} di ${app}${halaman && halaman !== '/' ? ` ${halaman}` : ''}`.slice(0, 200));
      })
      .catch((e) => !ac.signal.aborted && setGalatPeriksa(pesanKirim(e)));
    return () => ac.abort();
  }, [buka, info, siakad]);

  if (!info) return null;
  const sudah = periksa?.tiket ?? null;
  const hasil = kirim.hasil;
  const uraianKurang = uraian.trim().length < 10;

  const kirimLaporan = async () => {
    setKirim({ sibuk: true });
    try {
      // Dengan tangkapan layar dikirim multipart (body JSON API dibatasi kecil); tanpa lampiran cukup JSON.
      const r = await siakad.request<HasilKirim>({
        method: 'POST',
        path: '/v1/helpdesk/galat',
        body: {
          request_id: info.requestId,
          judul: sudah ? undefined : judul.trim() || undefined,
          uraian: uraian.trim() || undefined,
          url: info.url || undefined,
          status_http: info.status ?? undefined,
          kode_galat: info.kode ?? undefined,
          pesan: info.pesan ?? undefined,
          perangkat: info.perangkat || undefined,
          waktu: info.waktu,
          aplikasi: periksa?.aplikasi?.kode ?? window.location.hostname.split('.')[0],
          ...(berkas ? { lampiran: { data: berkas, filename: berkas.name } } : {}),
        },
        multipart: !!berkas,
      });
      setKirim({ sibuk: false, hasil: r.data });
    } catch (e) {
      setKirim({ sibuk: false, galat: pesanKirim(e) });
    }
  };

  const tutup = () => setBuka(false);
  const waktu = info.waktu ? `${formatDate(info.waktu, 'long')} ${formatTime(info.waktu)}` : '–';

  let isi: React.ReactNode;
  let kaki: React.ReactNode = null;
  if (tampil === 'saya') {
    isi = <TiketSaya siakad={siakad} kembali={() => setTampil('form')} sorot={hasil?.tiket.nomor ?? sudah?.nomor} />;
  } else if (hasil) {
    isi = (
      <div className="u-lapor-galat u-lapor-galat-selesai">
        <span className="u-lapor-galat-ikon" aria-hidden>
          <CircleCheck />
        </span>
        <h3>{hasil.baru ? 'Laporan terkirim ke Pustikom' : 'Keterangan ditambahkan'}</h3>
        <p>{hasil.baru ? 'Simpan nomor tiket ini bila ingin menanyakan perkembangannya.' : 'Kode ini sudah pernah Anda laporkan, jadi keterangan Anda masuk ke tiket yang sama.'}</p>
        <div className="u-lapor-galat-nomor">
          <code>{hasil.tiket.nomor}</code>
          <CopyButton text={hasil.tiket.nomor} label="Salin nomor tiket" />
        </div>
        <LencanaStatus status={hasil.tiket.status} />
        {hasil.terkait && <p className="u-lapor-galat-catatan">Kode yang sama juga dilaporkan pengguna lain; tiket Anda dikaitkan ke {hasil.terkait}.</p>}
        <p className="u-lapor-galat-catatan">Anda mendapat notifikasi saat Pustikom menanggapi atau mengubah status tiket.</p>
      </div>
    );
    kaki = (
      <>
        <Button variant="outline" onClick={() => setTampil('saya')}>
          <ListChecks /> Lihat tiket saya
        </Button>
        <Button onClick={tutup}>Selesai</Button>
      </>
    );
  } else {
    isi = (
      <div className="u-lapor-galat">
        <DescriptionList
          className="u-lapor-galat-info"
          items={[
            {
              label: 'Kode laporan',
              value: (
                <span className="u-lapor-galat-kode">
                  <code>{info.requestId}</code>
                  <CopyButton text={info.requestId} label="Salin kode laporan" />
                </span>
              ),
            },
            {
              label: 'Aplikasi',
              value: periksa ? (periksa.aplikasi ? `${periksa.aplikasi.nama} (${periksa.aplikasi.kode})` : window.location.hostname) : galatPeriksa ? window.location.hostname : <Skeleton width={140} height={14} />,
            },
            { label: 'Halaman', value: info.url ? <span className="u-lapor-galat-url">{info.url}</span> : '–' },
            { label: 'Waktu', value: waktu },
            { label: 'Galat', value: [info.status ? `HTTP ${info.status}` : null, info.kode, info.pesan].filter(Boolean).join(' · ') || '–' },
            { label: 'Perangkat', value: info.perangkat || '–' },
          ]}
        />
        <p className="u-lapor-galat-catatan">Data di atas terisi otomatis dan ikut terkirim. Token, kata sandi, dan isi formulir Anda tidak dikirim.</p>
        {galatPeriksa && <Alert variant="warning">{galatPeriksa}</Alert>}
        {sudah && (
          <Alert variant="info" title={`Kode ini sudah Anda laporkan: ${sudah.nomor}`} actions={<LencanaStatus status={sudah.status} />}>
            Tulis keterangan tambahan di bawah; keterangan masuk ke tiket yang sama, tidak membuat tiket baru.
          </Alert>
        )}
        {!sudah && periksa && periksa.laporan_lain > 0 && <Alert variant="neutral">Kode ini juga sudah dilaporkan pengguna lain. Laporan Anda akan dikaitkan ke laporan tersebut.</Alert>}
        {!sudah && (
          <Field label="Judul" required description="Sudah terisi saran; ubah bila perlu.">
            <Input value={judul} onChange={(e) => setJudul(e.target.value)} maxLength={200} placeholder="Ringkas masalahnya, mis. Gagal menyimpan nilai" />
          </Field>
        )}
        <Field label={sudah ? 'Keterangan tambahan' : 'Apa yang sedang Anda lakukan?'} required description="Langkah sebelum galat muncul, data yang dibuka, dan apa yang Anda harapkan. Minimal 10 karakter.">
          <Textarea rows={5} value={uraian} onChange={(e) => setUraian(e.target.value)} maxLength={5000} placeholder="Mis. membuka menu Nilai, memilih kelas, lalu menekan Simpan" />
        </Field>
        <Field label="Tangkapan layar" optional>
          {berkas ? (
            <FileList files={[{ id: 'lampiran', file: berkas, name: berkas.name, size: berkas.size }]} onRemove={() => setBerkas(null)} />
          ) : (
            <Dropzone accept="image/png,image/jpeg,image/webp" maxSize={MAKS_LAMPIRAN} onFiles={(f) => (setBerkas(f[0] ?? null), setTolakBerkas(null))} onReject={setTolakBerkas} hint="PNG, JPG, atau WEBP · maks. 5 MB" />
          )}
          {tolakBerkas && <span className="u-lapor-galat-tolak">{tolakBerkas}</span>}
        </Field>
        {kirim.galat && <Alert variant="danger">{kirim.galat}</Alert>}
      </div>
    );
    kaki = (
      <>
        <Button variant="ghost" onClick={() => setTampil('saya')}>
          <ListChecks /> Tiket saya
        </Button>
        <Button variant="outline" onClick={tutup}>
          Batal
        </Button>
        <Button onClick={() => void kirimLaporan()} loading={kirim.sibuk} disabled={uraianKurang || (!sudah && judul.trim().length < 5) || (!periksa && !galatPeriksa)}>
          <Send /> {sudah ? 'Kirim keterangan' : 'Kirim laporan'}
        </Button>
      </>
    );
  }

  return (
    <Sheet
      open={buka}
      onOpenChange={setBuka}
      size="md"
      title={
        <span className="u-lapor-galat-judul">
          <Bug aria-hidden /> {tampil === 'saya' ? 'Tiket saya' : 'Laporkan ke Pustikom'}
        </span>
      }
      description={tampil === 'saya' ? 'Laporan bug yang pernah Anda kirim.' : 'Buat tiket laporan bug yang terhubung ke kode galat ini, supaya Pustikom bisa langsung menelusuri log-nya.'}
      footer={kaki}
    >
      {isi}
    </Sheet>
  );
}
