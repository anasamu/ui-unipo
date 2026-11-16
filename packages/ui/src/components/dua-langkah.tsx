'use client';
import * as React from 'react';
import { Check, Copy, Download, KeyRound, Mail, MessageCircle, Printer, ShieldCheck, ShieldOff, Smartphone } from 'lucide-react';
import { cn } from '../lib/cn';
import { Badge, Button, Skeleton } from './actions';
import { Alert, Card, CardContent, CardFooter, CardHeader, DescriptionList } from './display';
import { Checkbox, Choice, Field, Input, OtpField, RadioGroup } from './forms';
import { Dialog } from './overlays';
import { KodeQr } from './kode-qr';

// ---------------------------------------------------------------- tipe API (SSO /api/akun/dua-langkah, docs/DUA_LANGKAH.md)

export type MetodeDuaLangkah = 'totp' | 'email' | 'whatsapp';

export interface PilihanMetodeDuaLangkah {
  kode: MetodeDuaLangkah;
  label: string;
  keterangan: string;
  /** Email tujuan yang disamarkan (metode email). */
  tujuan?: string;
}

export interface StatusDuaLangkah {
  aktif: boolean;
  metode: MetodeDuaLangkah | null;
  /** Email/nomor WhatsApp yang disamarkan. */
  tujuan: string | null;
  diaktifkan_at: string | null;
  sisa_kode_cadangan: number;
  perangkat_diingat: number;
  ingat_hari: number;
  metode_tersedia: PilihanMetodeDuaLangkah[];
  /**
   * Nomor HP di profil pengguna (disamarkan) yang dipakai metode WhatsApp, diisi BFF dari data pribadi SIAKAD.
   * `null`: nomor HP di profil belum ada, metode WhatsApp tidak bisa dipilih. Tidak ada (undefined): aplikasi lama,
   * nomor diketik pengguna.
   */
  nomor_whatsapp?: string | null;
  /** Hanya pada jawaban aktifkan dan kode cadangan baru. */
  kode_cadangan?: string[];
}

export interface MulaiDuaLangkah {
  setup_id: string;
  metode: MetodeDuaLangkah;
  berlaku_sampai: string;
  /** TOTP: secret Base32 dan alamat otpauth:// untuk QR. */
  secret?: string;
  otpauth?: string;
  penerbit?: string;
  akun?: string;
  /** Email/WhatsApp: tujuan tersamar dan jeda kirim ulang. */
  tujuan?: string;
  kirim_ulang_detik?: number;
}

/** Kode metode lama (atau kode cadangan) untuk tindakan yang butuh bukti pemilik. */
export interface BuktiDuaLangkah {
  kode: string;
  konfirmasi_id?: string;
}

/**
 * Jembatan ke API akun SSO. Aplikasi memanggilnya lewat server sendiri (BFF) karena API akun butuh client_secret;
 * pakai `apiDuaLangkahBff` untuk BFF standar aplikasi UNIPO.
 */
export interface ApiDuaLangkah {
  status(): Promise<StatusDuaLangkah>;
  mulai(metode: MetodeDuaLangkah, opsi?: { nomor?: string } & Partial<BuktiDuaLangkah>): Promise<MulaiDuaLangkah>;
  kirimUlang(setupId: string): Promise<{ tujuan: string; kirim_ulang_detik: number }>;
  aktifkan(setupId: string, kode: string): Promise<StatusDuaLangkah>;
  kirimKonfirmasi(): Promise<{ konfirmasi_id: string; tujuan: string; kirim_ulang_detik: number }>;
  matikan(bukti: BuktiDuaLangkah): Promise<StatusDuaLangkah>;
  kodeCadangan(bukti: BuktiDuaLangkah): Promise<StatusDuaLangkah>;
  lupakanPerangkat(): Promise<StatusDuaLangkah>;
}

export class GalatDuaLangkah extends Error {
  constructor(public kode: string, pesan: string, public status = 422) {
    super(pesan);
  }
}

/**
 * Adaptor untuk BFF aplikasi: POST JSON ke `${basis}/<aksi>` dengan header X-CSRF-Token, jawaban `{data}` atau
 * `{error: {code, message}}` (sama dengan API akun SSO). Bawaan basis `/bff/keamanan`.
 */
export function apiDuaLangkahBff(csrf: string, basis = '/bff/keamanan'): ApiDuaLangkah {
  const kirim = async <T,>(aksi: string, isi: Record<string, string | undefined> = {}): Promise<T> => {
    const r = await fetch(basis + aksi, {
      method: aksi === '' ? 'GET' : 'POST',
      credentials: 'same-origin',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'X-CSRF-Token': csrf },
      body: aksi === '' ? undefined : JSON.stringify(Object.fromEntries(Object.entries(isi).filter(([, v]) => v !== undefined && v !== ''))),
    });
    const j = (await r.json().catch(() => null)) as { data?: T; error?: { code?: string; message?: string } } | null;
    if (!r.ok || !j || j.data === undefined) {
      throw new GalatDuaLangkah(j?.error?.code ?? 'galat', j?.error?.message ?? 'Layanan keamanan akun tidak menjawab (' + r.status + ').', r.status);
    }
    return j.data;
  };
  return {
    status: () => kirim<StatusDuaLangkah>(''),
    mulai: (metode, o = {}) => kirim('/mulai', { metode, nomor: o.nomor, kode: o.kode, konfirmasi_id: o.konfirmasi_id }),
    kirimUlang: (setup_id) => kirim('/kirim-ulang', { setup_id }),
    aktifkan: (setup_id, kode) => kirim('/aktifkan', { setup_id, kode }),
    kirimKonfirmasi: () => kirim('/kirim-konfirmasi'),
    matikan: (b) => kirim('/matikan', { kode: b.kode, konfirmasi_id: b.konfirmasi_id }),
    kodeCadangan: (b) => kirim('/kode-cadangan', { kode: b.kode, konfirmasi_id: b.konfirmasi_id }),
    lupakanPerangkat: () => kirim('/lupakan-perangkat'),
  };
}

const IKON_METODE: Record<MetodeDuaLangkah, React.ReactNode> = {
  totp: <Smartphone />,
  email: <Mail />,
  whatsapp: <MessageCircle />,
};

export function labelMetodeDuaLangkah(m: MetodeDuaLangkah | null, tujuan?: string | null): string {
  if (m === 'totp') return 'Aplikasi authenticator';
  if (m === 'email') return 'Kode lewat email' + (tujuan ? ' (' + tujuan + ')' : '');
  if (m === 'whatsapp') return 'Kode lewat WhatsApp' + (tujuan ? ' (' + tujuan + ')' : '');
  return 'Belum diatur';
}

const pesan = (e: unknown) => (e instanceof Error ? e.message : 'Terjadi kesalahan. Coba lagi.');

function tanggal(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
}

/** Hitung mundur detik (kirim ulang kode). */
function useHitungMundur(): [number, (detik: number) => void] {
  const [sisa, setSisa] = React.useState(0);
  React.useEffect(() => {
    if (sisa <= 0) return;
    const t = setTimeout(() => setSisa((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [sisa]);
  return [sisa, setSisa];
}

// ---------------------------------------------------------------- komponen utama

export interface PengaturanDuaLangkahProps {
  api: ApiDuaLangkah;
  /** Dipanggil setiap status berubah (aktif/mati/ganti metode). */
  onBerubah?: (status: StatusDuaLangkah) => void;
  /** Tampilkan saran mengaktifkan saat masih mati (bawaan true). */
  saran?: boolean;
  /** Alamat untuk mengubah nomor HP di profil (bawaan /data-pribadi), ditampilkan pada metode WhatsApp. */
  tautanUbahNomor?: string;
  className?: string;
}

/**
 * Pengaturan login dua langkah akun SSO: aktifkan (aplikasi authenticator bawaan; email/WhatsApp bila integrasinya
 * aktif), kode cadangan, ganti metode, lupakan perangkat, dan matikan. Dipakai aplikasi profil di /keamanan.
 */
export function PengaturanDuaLangkah({ api, onBerubah, saran = true, tautanUbahNomor = '/data-pribadi', className }: PengaturanDuaLangkahProps) {
  const [status, setStatus] = React.useState<StatusDuaLangkah | null>(null);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [atur, setAtur] = React.useState<null | { bukti?: BuktiDuaLangkah }>(null);
  const [konfirmasi, setKonfirmasi] = React.useState<null | 'matikan' | 'cadangan' | 'ganti'>(null);
  const [cadangan, setCadangan] = React.useState<string[] | null>(null);
  const [sibuk, setSibuk] = React.useState(false);

  const muat = React.useCallback(() => {
    setGalat(null);
    api.status().then(setStatus, (e) => setGalat(pesan(e)));
  }, [api]);
  React.useEffect(muat, [muat]);

  const terima = (s: StatusDuaLangkah) => {
    setStatus(s);
    onBerubah?.(s);
    if (s.kode_cadangan?.length) setCadangan(s.kode_cadangan);
  };

  if (galat && !status) {
    return (
      <Alert variant="danger" title="Pengaturan login dua langkah belum bisa dimuat" className={className} actions={<Button size="sm" variant="outline" onClick={muat}>Coba lagi</Button>}>
        {galat}
      </Alert>
    );
  }
  if (!status) {
    return (
      <Card className={className}>
        <CardContent>
          <Skeleton style={{ height: 20, width: '40%' }} />
          <Skeleton style={{ height: 14, width: '80%', marginTop: 12 }} />
        </CardContent>
      </Card>
    );
  }

  const kirimLewat = status.metode === 'email' || status.metode === 'whatsapp';

  return (
    <div className={cn('u-2fa', className)}>
      {!status.aktif && saran && (
        <Alert variant="warning" title="Akun Anda hanya dilindungi password">
          Aktifkan login dua langkah agar orang yang mengetahui password Anda tetap tidak bisa masuk tanpa kode dari ponsel Anda.
        </Alert>
      )}
      <Card>
        <CardHeader
          title={
            <span className="u-2fa-judul">
              Login dua langkah {status.aktif ? <Badge variant="success">Aktif</Badge> : <Badge variant="neutral">Mati</Badge>}
            </span>
          }
          description="Setelah password, SSO UNIPO meminta kode kedua. Berlaku untuk SIAKAD dan semua aplikasi kampus yang masuk lewat SSO."
        />
        <CardContent>
          {status.aktif ? (
            <DescriptionList
              items={[
                { label: 'Metode', value: <span className="u-2fa-metode">{status.metode && IKON_METODE[status.metode]}{labelMetodeDuaLangkah(status.metode, status.tujuan)}</span> },
                { label: 'Aktif sejak', value: tanggal(status.diaktifkan_at) },
                {
                  label: 'Kode cadangan',
                  value: (
                    <span>
                      {status.sisa_kode_cadangan} dari 10 tersisa
                      {status.sisa_kode_cadangan <= 3 && <Badge variant="warning" className="u-2fa-badge-sisa">Hampir habis</Badge>}
                    </span>
                  ),
                },
                {
                  label: 'Perangkat tanpa kode',
                  value: status.perangkat_diingat > 0 ? `${status.perangkat_diingat} perangkat tidak dimintai kode (maks. ${status.ingat_hari} hari)` : 'Tidak ada',
                },
              ]}
            />
          ) : (
            <ul className="u-2fa-pilihan">
              {status.metode_tersedia.map((m) => (
                <li key={m.kode}>
                  <span className="u-2fa-pilihan-ikon" aria-hidden>{IKON_METODE[m.kode]}</span>
                  <span>
                    <strong>{m.label}</strong>
                    {m.kode === 'totp' && <Badge variant="info" className="u-2fa-badge-sisa">Disarankan</Badge>}
                    <span className="u-muted u-2fa-ket">{m.keterangan}</span>
                  </span>
                </li>
              ))}
            </ul>
          )}
          {galat && <Alert variant="danger" className="u-2fa-galat">{galat}</Alert>}
        </CardContent>
        <CardFooter className="u-2fa-aksi">
          {status.aktif ? (
            <>
              <Button variant="outline" onClick={() => setKonfirmasi('cadangan')}><KeyRound />Buat kode cadangan baru</Button>
              <Button variant="outline" onClick={() => setKonfirmasi('ganti')}><Smartphone />Ganti metode</Button>
              {status.perangkat_diingat > 0 && (
                <Button
                  variant="ghost"
                  disabled={sibuk}
                  onClick={async () => {
                    setSibuk(true);
                    try {
                      terima(await api.lupakanPerangkat());
                    } catch (e) {
                      setGalat(pesan(e));
                    } finally {
                      setSibuk(false);
                    }
                  }}
                >
                  Minta kode lagi di semua perangkat
                </Button>
              )}
              <Button variant="destructive-soft" onClick={() => setKonfirmasi('matikan')}><ShieldOff />Matikan</Button>
            </>
          ) : (
            <Button onClick={() => setAtur({})}><ShieldCheck />Aktifkan login dua langkah</Button>
          )}
        </CardFooter>
      </Card>

      {atur && (
        <DialogAturDuaLangkah
          api={api}
          status={status}
          bukti={atur.bukti}
          tautanUbahNomor={tautanUbahNomor}
          onTutup={() => setAtur(null)}
          onSelesai={(s) => {
            setAtur(null);
            terima(s);
          }}
        />
      )}
      {konfirmasi && (
        <DialogBuktiDuaLangkah
          api={api}
          kirimLewat={kirimLewat}
          tujuan={status.tujuan}
          judul={konfirmasi === 'matikan' ? 'Matikan login dua langkah' : konfirmasi === 'cadangan' ? 'Buat kode cadangan baru' : 'Ganti metode login dua langkah'}
          keterangan={
            konfirmasi === 'matikan'
              ? 'Setelah dimatikan, akun Anda hanya dilindungi password. Masukkan kode yang berlaku untuk memastikan ini Anda.'
              : konfirmasi === 'cadangan'
                ? 'Semua kode cadangan lama tidak berlaku lagi. Masukkan kode yang berlaku untuk melanjutkan.'
                : 'Masukkan kode dari metode yang sekarang. Metode lama tetap berlaku sampai metode baru selesai diverifikasi.'
          }
          tombol={konfirmasi === 'matikan' ? 'Matikan' : konfirmasi === 'cadangan' ? 'Buat kode baru' : 'Lanjut'}
          berbahaya={konfirmasi === 'matikan'}
          onTutup={() => setKonfirmasi(null)}
          onBukti={async (b) => {
            if (konfirmasi === 'ganti') {
              setKonfirmasi(null);
              setAtur({ bukti: b });
              return;
            }
            const s = konfirmasi === 'matikan' ? await api.matikan(b) : await api.kodeCadangan(b);
            setKonfirmasi(null);
            terima(s);
          }}
        />
      )}
      {cadangan && <DialogKodeCadangan kode={cadangan} onTutup={() => setCadangan(null)} />}
    </div>
  );
}

// ---------------------------------------------------------------- dialog mengaktifkan

function DialogAturDuaLangkah({
  api,
  status,
  bukti,
  tautanUbahNomor,
  onTutup,
  onSelesai,
}: {
  api: ApiDuaLangkah;
  status: StatusDuaLangkah;
  bukti?: BuktiDuaLangkah;
  tautanUbahNomor: string;
  onTutup: () => void;
  onSelesai: (s: StatusDuaLangkah) => void;
}) {
  const pilihan = status.metode_tersedia;
  // Nomor WhatsApp mengikuti nomor HP di profil bila aplikasi (BFF) mengirimkannya.
  const nomorProfil = status.nomor_whatsapp;
  const ikutProfil = nomorProfil !== undefined;
  const [metode, setMetode] = React.useState<MetodeDuaLangkah>('totp');
  const [nomor, setNomor] = React.useState('');
  const [setup, setSetup] = React.useState<MulaiDuaLangkah | null>(null);
  const [kode, setKode] = React.useState('');
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [tampilSecret, setTampilSecret] = React.useState(false);
  const [mundur, setMundur] = useHitungMundur();

  const mulai = async () => {
    setSibuk(true);
    setGalat(null);
    try {
      const s = await api.mulai(metode, { nomor: metode === 'whatsapp' && !ikutProfil ? nomor : undefined, ...bukti });
      setSetup(s);
      setKode('');
      setMundur(s.kirim_ulang_detik ?? 0);
    } catch (e) {
      setGalat(pesan(e));
    } finally {
      setSibuk(false);
    }
  };
  const aktifkan = async (k = kode) => {
    if (!setup || k.length !== 6) return;
    setSibuk(true);
    setGalat(null);
    try {
      onSelesai(await api.aktifkan(setup.setup_id, k));
    } catch (e) {
      setGalat(pesan(e));
      setKode('');
      if (e instanceof GalatDuaLangkah && (e.kode === 'tantangan_batal' || e.kode === 'setup_kedaluwarsa')) setSetup(null);
    } finally {
      setSibuk(false);
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onTutup()}
      size="md"
      title={setup ? (setup.metode === 'totp' ? 'Pindai kode QR' : 'Masukkan kode verifikasi') : 'Pilih metode login dua langkah'}
      description={setup ? 'Langkah 2 dari 3' : 'Langkah 1 dari 3'}
      footer={
        setup ? (
          <>
            <Button variant="ghost" onClick={() => setSetup(null)} disabled={sibuk}>Kembali</Button>
            <Button onClick={() => void aktifkan()} disabled={sibuk || kode.length !== 6} loading={sibuk}>Verifikasi dan aktifkan</Button>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onTutup}>Batal</Button>
            <Button onClick={() => void mulai()} disabled={sibuk || (metode === 'whatsapp' && (ikutProfil ? !nomorProfil : nomor.replace(/\D/g, '').length < 10))} loading={sibuk}>Lanjut</Button>
          </>
        )
      }
    >
      {!setup ? (
        <div className="u-2fa-langkah">
          <RadioGroup<MetodeDuaLangkah>
            variant="card"
            columns={1}
            value={metode}
            onValueChange={setMetode}
            options={pilihan.map((p) => ({
              value: p.kode,
              label: p.label + (p.kode === 'totp' ? ' (disarankan)' : ''),
              description: p.keterangan + (p.tujuan ? ' Tujuan: ' + p.tujuan + '.' : ''),
              icon: IKON_METODE[p.kode],
            }))}
          />
          {pilihan.length === 1 && (
            <p className="u-muted u-2fa-ket">Pilihan kode lewat email atau WhatsApp muncul bila Pustikom mengaktifkan integrasinya.</p>
          )}
          {metode === 'whatsapp' && ikutProfil && (
            nomorProfil ? (
              <p className="u-muted u-2fa-ket">
                Kode dikirim ke nomor HP di profil Anda, <strong>{nomorProfil}</strong>, sekarang dan setiap kali Anda masuk. Nomor salah?{' '}
                <a href={tautanUbahNomor}>Ubah di data pribadi</a>, lalu aktifkan lagi.
              </p>
            ) : (
              <Alert variant="warning">
                Nomor HP di profil Anda belum diisi. <a href={tautanUbahNomor}>Isi nomor HP di data pribadi</a> dulu, lalu pilih WhatsApp lagi.
              </Alert>
            )
          )}
          {metode === 'whatsapp' && !ikutProfil && (
            <Field label="Nomor WhatsApp" description="Kode verifikasi dikirim ke nomor ini sekarang dan setiap kali Anda masuk.">
              <Input value={nomor} onChange={(e) => setNomor(e.target.value)} inputMode="tel" autoComplete="tel" placeholder="081234567890" />
            </Field>
          )}
          {galat && <Alert variant="danger">{galat}</Alert>}
        </div>
      ) : (
        <div className="u-2fa-langkah">
          {setup.metode === 'totp' && setup.otpauth ? (
            <div className="u-2fa-qr">
              <KodeQr nilai={setup.otpauth} ukuran={184} label="Kode QR untuk aplikasi authenticator" />
              <ol className="u-2fa-urutan">
                <li>Buka Google Authenticator (atau Microsoft Authenticator, Authy, 2FAS) di ponsel.</li>
                <li>Ketuk <strong>+</strong> lalu <strong>Pindai kode QR</strong>, arahkan ke kode di samping.</li>
                <li>Masukkan 6 angka yang muncul untuk <strong>{setup.penerbit}</strong> ({setup.akun}).</li>
              </ol>
              <div className="u-2fa-secret">
                {tampilSecret ? (
                  <>
                    <span className="u-muted">Tidak bisa memindai? Ketik kunci ini di aplikasi (berbasis waktu):</span>
                    <code>{setup.secret?.replace(/(.{4})/g, '$1 ').trim()}</code>
                    <TombolSalin teks={setup.secret ?? ''} label="Salin kunci" />
                  </>
                ) : (
                  <Button variant="link" size="sm" onClick={() => setTampilSecret(true)}>Tidak bisa memindai kode QR?</Button>
                )}
              </div>
            </div>
          ) : (
            <p>
              Kode 6 digit sudah dikirim ke {setup.metode === 'email' ? 'email' : 'WhatsApp'} <strong>{setup.tujuan}</strong>. Kode berlaku 5 menit.
            </p>
          )}
          <Field label="Kode verifikasi">
            <OtpField
              value={kode}
              onValueChange={(v) => setKode(v)}
              onValueComplete={(v) => void aktifkan(v)}
              validationType="numeric"
              separatorAfter={3}
              autoFocus
            />
          </Field>
          {setup.metode !== 'totp' && (
            <Button
              variant="link"
              size="sm"
              disabled={mundur > 0 || sibuk}
              onClick={async () => {
                setGalat(null);
                try {
                  const r = await api.kirimUlang(setup.setup_id);
                  setMundur(r.kirim_ulang_detik);
                } catch (e) {
                  setGalat(pesan(e));
                }
              }}
            >
              Kirim ulang kode{mundur > 0 ? ` (${mundur} dtk)` : ''}
            </Button>
          )}
          {galat && <Alert variant="danger">{galat}</Alert>}
        </div>
      )}
    </Dialog>
  );
}

// ---------------------------------------------------------------- dialog bukti (kode yang berlaku)

function DialogBuktiDuaLangkah({
  api,
  kirimLewat,
  tujuan,
  judul,
  keterangan,
  tombol,
  berbahaya,
  onTutup,
  onBukti,
}: {
  api: ApiDuaLangkah;
  kirimLewat: boolean;
  tujuan: string | null;
  judul: string;
  keterangan: string;
  tombol: string;
  berbahaya?: boolean;
  onTutup: () => void;
  onBukti: (b: BuktiDuaLangkah) => Promise<void>;
}) {
  const [kode, setKode] = React.useState('');
  const [cadangan, setCadangan] = React.useState(false);
  const [konfirmasiId, setKonfirmasiId] = React.useState<string | undefined>();
  const [galat, setGalat] = React.useState<string | null>(null);
  const [sibuk, setSibuk] = React.useState(false);
  const [mundur, setMundur] = useHitungMundur();
  const bersih = kode.replace(/[\s-]/g, '');
  const sah = cadangan ? /^[a-zA-Z2-9]{8}$/.test(bersih) : /^\d{6}$/.test(bersih);

  const kirim = async () => {
    setGalat(null);
    try {
      const r = await api.kirimKonfirmasi();
      setKonfirmasiId(r.konfirmasi_id);
      setMundur(r.kirim_ulang_detik);
    } catch (e) {
      setGalat(pesan(e));
    }
  };

  return (
    <Dialog
      open
      onOpenChange={(o) => !o && onTutup()}
      size="sm"
      title={judul}
      description={keterangan}
      footer={
        <>
          <Button variant="ghost" onClick={onTutup} disabled={sibuk}>Batal</Button>
          <Button
            variant={berbahaya ? 'destructive' : 'primary'}
            disabled={!sah || sibuk}
            loading={sibuk}
            onClick={async () => {
              setSibuk(true);
              setGalat(null);
              try {
                await onBukti({ kode: bersih, konfirmasi_id: konfirmasiId });
              } catch (e) {
                setGalat(pesan(e));
              } finally {
                setSibuk(false);
              }
            }}
          >
            {tombol}
          </Button>
        </>
      }
    >
      <div className="u-2fa-langkah">
        {kirimLewat && (
          <div className="u-2fa-kirim">
            <span className="u-muted">{konfirmasiId ? `Kode dikirim ke ${tujuan}.` : `Minta kode ke ${tujuan}, atau pakai kode cadangan.`}</span>
            <Button variant="outline" size="sm" disabled={mundur > 0} onClick={() => void kirim()}>
              {konfirmasiId ? 'Kirim ulang' : 'Kirim kode'}{mundur > 0 ? ` (${mundur})` : ''}
            </Button>
          </div>
        )}
        {cadangan ? (
          <Field label="Kode cadangan" description="Salah satu dari 10 kode cadangan yang Anda simpan (xxxx-xxxx).">
            <Input value={kode} onChange={(e) => setKode(e.target.value)} autoComplete="off" autoCapitalize="none" spellCheck={false} maxLength={9} autoFocus placeholder="xxxx-xxxx" className="u-2fa-input-kode" />
          </Field>
        ) : (
          <Field label="Kode verifikasi" description={kirimLewat ? 'Kode 6 digit yang dikirim.' : 'Kode 6 digit dari aplikasi authenticator.'}>
            <OtpField value={kode} onValueChange={(v) => setKode(v)} validationType="numeric" separatorAfter={3} autoFocus />
          </Field>
        )}
        <Button
          variant="link"
          size="sm"
          className="u-2fa-tukar"
          onClick={() => {
            setCadangan(!cadangan);
            setKode('');
            setGalat(null);
          }}
        >
          {cadangan ? (kirimLewat ? 'Pakai kode yang dikirim' : 'Pakai kode dari aplikasi authenticator') : 'Pakai kode cadangan'}
        </Button>
        {galat && <Alert variant="danger">{galat}</Alert>}
      </div>
    </Dialog>
  );
}

// ---------------------------------------------------------------- kode cadangan

function TombolSalin({ teks, label = 'Salin' }: { teks: string; label?: string }) {
  const [tersalin, setTersalin] = React.useState(false);
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(teks).then(() => {
          setTersalin(true);
          setTimeout(() => setTersalin(false), 2000);
        });
      }}
    >
      {tersalin ? <Check /> : <Copy />}
      {tersalin ? 'Tersalin' : label}
    </Button>
  );
}

/** Tampilkan 10 kode cadangan sekali saja: salin, unduh .txt, cetak; wajib dicentang sebelum ditutup. */
export function DialogKodeCadangan({ kode, onTutup, akun }: { kode: string[]; onTutup: () => void; akun?: string }) {
  const [disimpan, setDisimpan] = React.useState(false);
  const teks =
    'Kode cadangan login dua langkah SSO UNIPO' + (akun ? ' (' + akun + ')' : '') + '\n' +
    'Dibuat ' + new Date().toLocaleString('id-ID') + '. Setiap kode hanya bisa dipakai sekali.\n\n' + kode.join('\n') + '\n';
  const unduh = () => {
    const url = URL.createObjectURL(new Blob([teks], { type: 'text/plain;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kode-cadangan-sso-unipo.txt';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const cetak = () => {
    const w = window.open('', '_blank', 'width=480,height=640');
    if (!w) return;
    w.document.title = 'Kode cadangan SSO UNIPO';
    const pre = w.document.createElement('pre');
    pre.style.cssText = 'font:16px/1.8 ui-monospace,Menlo,monospace;padding:24px;white-space:pre-wrap';
    pre.textContent = teks;
    w.document.body.appendChild(pre);
    w.print();
  };
  return (
    <Dialog
      open
      onOpenChange={(o) => !o && disimpan && onTutup()}
      size="md"
      title="Simpan kode cadangan Anda"
      description="Langkah 3 dari 3. Pakai salah satu kode ini bila ponsel hilang atau kode tidak terkirim. Kode hanya ditampilkan sekali ini."
      footer={<Button onClick={onTutup} disabled={!disimpan}>Selesai</Button>}
    >
      <div className="u-2fa-langkah">
        <ol className="u-2fa-cadangan" aria-label="Kode cadangan">
          {kode.map((k) => (
            <li key={k}><code>{k}</code></li>
          ))}
        </ol>
        <div className="u-2fa-aksi">
          <TombolSalin teks={kode.join('\n')} label="Salin semua" />
          <Button variant="outline" size="sm" onClick={unduh}><Download />Unduh .txt</Button>
          <Button variant="outline" size="sm" onClick={cetak}><Printer />Cetak</Button>
        </div>
        <Alert variant="info">Simpan di tempat aman yang terpisah dari ponsel, misalnya pengelola password atau kertas di dompet. Jangan bagikan kepada siapa pun.</Alert>
        <Choice label="Saya sudah menyimpan kode cadangan ini" control={<Checkbox checked={disimpan} onCheckedChange={(v) => setDisimpan(Boolean(v))} />} />
      </div>
    </Dialog>
  );
}
