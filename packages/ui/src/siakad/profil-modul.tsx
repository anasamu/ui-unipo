'use client';
import * as React from 'react';
import {
  Award,
  BadgeCheck,
  BookOpen,
  Briefcase,
  CalendarClock,
  FileEdit,
  FlaskConical,
  GraduationCap,
  HeartHandshake,
  IdCard,
  Mail,
  MapPin,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Trash2,
  Users,
  Wallet,
} from 'lucide-react';
import { ProgressBertumpuk } from '../components/progres';
import { cn } from '../lib/cn';
import { formatDate, formatNumber, formatRupiah } from '../lib/format';
import { Badge, Button, Skeleton } from '../components/actions';
import { Alert, Avatar, DescriptionList, Empty, Progress, Tabs, type TabItem } from '../components/display';
import { Field, Input, Switch, Textarea } from '../components/forms';
import { GridForm, IsianTanggal, PanelForm, Pilihan, opsiDariPeta } from '../components/formulir';
import { PETUNJUK_ISIAN, PilihKecamatan } from './kelengkapan';
import { ModalFitur } from '../components/modal-fitur';
import { ConfirmDialog, Dialog, useToast } from '../components/overlays';
import { Dropzone, FileList } from '../components/calendar';
import { Ilustrasi, type NamaIlustrasi } from '../ikon/ilustrasi';
import { DataDiriMahasiswa, JadwalMengajar, MahasiswaBimbingan, RiwayatStudi, labelTahunAkademik } from './akademik';
import { useAkunSaya } from './akun';
import { RincianPembayaran, rincianDariKeuanganMahasiswa } from './kwitansi';
import { GalatApi } from './galat';
import { LabelProdi } from './prodi';
import { invalidateSiakad, pesanGalat, useSiakad, useSiakadQuery } from './provider';

// ================================================================ Data /v1/profil/saya

export type PeranProfil = 'mahasiswa' | 'alumni' | 'dosen' | 'tendik' | 'pengguna';
export interface IsianDataPribadi {
  kode: string;
  label: string;
  kelompok: string;
  jenis: string;
  nilai: string | null;
  tampil: string | null;
  bisa_diubah: boolean;
  bisa_diajukan: boolean;
}
export interface ProfilSayaLengkap {
  akun: { username: string; nama: string; email?: string | null; level: string; login_terakhir?: string | null; bisa_ganti_password?: boolean };
  identitas: {
    peran: PeranProfil;
    peran_label: string;
    kunci: string;
    kunci_label: string;
    kode_prodi?: string | null;
    nama_prodi?: string | null;
    jenjang?: string | null;
    fakultas?: string | null;
  } & Record<string, unknown>;
  data_pribadi: IsianDataPribadi[];
  kelompok_data?: Record<string, string>;
  profil?: { nama_panggilan?: string | null; judul?: string | null; bio?: string | null; keahlian?: string[]; punya_foto?: boolean } & Record<string, unknown>;
  ringkasan?: Record<string, number>;
  kelengkapan?: { persen_wajib: number; lengkap: boolean; kurang: Array<{ kolom: string; label: string; wajib: boolean; bisa_diisi_sendiri: boolean }> } | null;
}

/** Profil lengkap pemilik token: akun, identitas (peran + NIM/NIDN/NIK), data pribadi, ringkasan, kelengkapan. */
export function useProfilSaya() {
  return useSiakadQuery<ProfilSayaLengkap>(['profil', 'saya'], (s, signal) => s.request<ProfilSayaLengkap>({ method: 'GET', path: '/v1/profil/saya' }, { signal }), { staleTime: 60_000 });
}

const KELOMPOK: Record<string, string> = { identitas: 'Identitas', kontak: 'Kontak', alamat: 'Alamat', keluarga: 'Keluarga' };
const ILUS_PERAN: Record<PeranProfil, NamaIlustrasi> = { mahasiswa: 'mahasiswa', alumni: 'kelulusan-saya', dosen: 'dosen', tendik: 'tendik', pengguna: 'profil' };

function KosongIlus({ nama, title, description, actions }: { nama: NamaIlustrasi; title: string; description?: string; actions?: React.ReactNode }) {
  return <Empty icon={<Ilustrasi nama={nama} lebar={150} />} title={title} description={description} actions={actions} className="u-modul-kosong" />;
}

// ================================================================ Kepala profil

/** Kepala profil semua peran: foto, nama, peran, NIM/NIDN/NIK, prodi, kelengkapan data, dan ringkasan riwayat. */
export function KepalaProfilSaya({ aksi, className }: { aksi?: React.ReactNode; className?: string }) {
  const q = useProfilSaya();
  const akun = useAkunSaya();
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={168} />;
  const id = d.identitas;
  const r = d.ringkasan ?? {};
  return (
    <section className={cn('u-modul-kepala', className)}>
      <Ilustrasi nama={ILUS_PERAN[id.peran] ?? 'profil'} lebar={170} className="u-modul-kepala-ilus" />
      <div className="u-modul-kepala-isi">
        <div className="u-modul-kepala-id">
          <Avatar name={d.akun.nama} src={akun.pengguna?.foto ?? undefined} size="xl" />
          <div>
            <h3>{d.profil?.judul ? `${d.akun.nama}` : d.akun.nama}</h3>
            <p>
              <Badge variant="info">{id.peran_label}</Badge>
              <span>
                {id.kunci_label} <b className="u-mono">{id.kunci}</b>
              </span>
              {(id.kode_prodi || id.nama_prodi) && <LabelProdi kode={id.kode_prodi} nama={id.nama_prodi} prodi={{ kode_jenjang: id.jenjang }} />}
            </p>
            {d.profil?.judul && <p className="u-modul-kepala-judul">{d.profil.judul}</p>}
          </div>
          {aksi && <div className="u-modul-kepala-aksi">{aksi}</div>}
        </div>
        {d.kelengkapan && (
          <Progress
            value={d.kelengkapan.persen_wajib}
            label={d.kelengkapan.lengkap ? 'Data wajib PDDikti lengkap' : `Kelengkapan data wajib · kurang ${d.kelengkapan.kurang.filter((k) => k.wajib).length} isian`}
            tone={d.kelengkapan.lengkap ? 'success' : 'warning'}
            format={(v) => `${v}%`}
          />
        )}
        <dl className="u-modul-angka">
          {(
            [
              ['Pendidikan', r.pendidikan],
              ['Pekerjaan', r.pekerjaan],
              ['Prestasi', r.prestasi],
              ['Organisasi', r.organisasi],
              ['Dokumen', r.dokumen],
            ] as Array<[string, number | undefined]>
          ).map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{formatNumber(v ?? 0)}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// ================================================================ Data pribadi

const JENIS_TINGGAL: Record<string, string> = { '1': 'Bersama orang tua', '2': 'Wali', '3': 'Kos', '4': 'Asrama', '5': 'Panti asuhan', '10': 'Rumah sendiri', '99': 'Lainnya' };

/** Satu isian data pribadi dengan kontrol sesuai jenisnya (kecamatan dicari, jenis tinggal dipilih, NIK/HP angka). */
function IsianDataPribadiSaya({ isian: x, value, onChange, error }: { isian: IsianDataPribadi; value: string; onChange: (v: string) => void; error?: string }) {
  const p = PETUNJUK_ISIAN[x.kode] ?? {};
  const ref = useSiakadQuery<{ jenis_tinggal: Record<string, string> }>(
    ['kelengkapan', 'referensi'],
    (s, signal) => s.request<{ jenis_tinggal: Record<string, string> }>({ method: 'GET', path: '/v1/kelengkapan/referensi' }, { signal }),
    { enabled: x.jenis === 'jenis_tinggal', staleTime: 3_600_000 },
  );
  const id = `pribadi-${x.kode}`;
  let kontrol: React.ReactNode;
  if (x.jenis === 'wilayah') kontrol = <PilihKecamatan id={id} value={value || null} labelAwal={x.tampil} onValueChange={(k) => onChange(k ?? '')} />;
  else if (x.jenis === 'jenis_tinggal') kontrol = <Pilihan id={id} options={opsiDariPeta(ref.data?.jenis_tinggal ?? JENIS_TINGGAL)} value={value || null} onValueChange={(v) => onChange(v ?? '')} />;
  else if (x.jenis === 'tanggal') kontrol = <IsianTanggal id={id} value={value || null} onValueChange={onChange} />;
  else if (p.multiline || x.kode === 'alamat') kontrol = <Textarea id={id} rows={2} value={value} onChange={(e) => onChange(e.target.value)} />;
  else
    kontrol = (
      <Input
        id={id}
        value={value}
        type={p.type ?? (x.jenis === 'email' ? 'email' : x.jenis === 'hp' ? 'tel' : 'text')}
        inputMode={p.inputMode}
        maxLength={p.maxLength}
        placeholder={p.placeholder}
        onChange={(e) => onChange(p.filter ? p.filter(e.target.value) : e.target.value)}
      />
    );
  const lebar = p.span || x.jenis === 'wilayah' || x.kode === 'alamat';
  return (
    <Field label={x.label} description={p.description} error={error || undefined} className={lebar ? 'u-form-lebar' : undefined}>
      {kontrol}
    </Field>
  );
}

/**
 * Data pribadi per kelompok (identitas, kontak, alamat, keluarga) dari /v1/profil/saya. Isian `bisa_diubah` disimpan
 * lewat POST /v1/profil/saya/data-pribadi (validasi sama dengan wizard PDDikti); isian induk (nama, tanggal lahir,
 * agama, …) diajukan lewat POST /v1/profil/permohonan dan diputus petugas BAK/SDM.
 */
export function DataPribadiSaya({ className }: { className?: string }) {
  const q = useProfilSaya();
  const siakad = useSiakad();
  const [ubah, setUbah] = React.useState<string | null>(null);
  const [ajukan, setAjukan] = React.useState<IsianDataPribadi | null>(null);
  const [isi, setIsi] = React.useState<Record<string, string>>({});
  const [salah, setSalah] = React.useState<Record<string, string>>({});
  const [baru, setBaru] = React.useState('');
  const [alasan, setAlasan] = React.useState('');
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={320} />;
  const kelompok = [...new Set(d.data_pribadi.map((x) => x.kelompok))];
  const label = { ...KELOMPOK, ...(d.kelompok_data ?? {}) };
  const kurang = new Set((d.kelengkapan?.kurang ?? []).map((k) => k.kolom));
  const daftarUbah = d.data_pribadi.filter((x) => x.kelompok === ubah && x.bisa_diubah);
  return (
    <div className={cn('u-modul-grid', className)}>
      {kelompok.map((k) => {
        const item = d.data_pribadi.filter((x) => x.kelompok === k);
        const bisa = item.some((x) => x.bisa_diubah);
        return (
          <section key={k} className="u-modul-kartu">
            <header>
              <h4>{label[k] ?? k}</h4>
              {bisa && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsi(Object.fromEntries(item.filter((x) => x.bisa_diubah).map((x) => [x.kode, x.nilai ?? ''])));
                    setSalah({});
                    setUbah(k);
                  }}
                >
                  <Pencil /> Ubah
                </Button>
              )}
            </header>
            <DescriptionList
              items={item.map((x) => ({
                label: x.label,
                value: (
                  <span className="u-modul-nilai">
                    {x.tampil ?? <span className="u-muted">Belum diisi</span>}
                    {kurang.has(x.kode) && <Badge variant="warning">Wajib</Badge>}
                    {x.bisa_diajukan && (
                      <Button
                        size="xs"
                        variant="link"
                        onClick={() => {
                          setBaru('');
                          setAlasan('');
                          setAjukan(x);
                        }}
                      >
                        Ajukan perubahan
                      </Button>
                    )}
                  </span>
                ),
              }))}
            />
          </section>
        );
      })}
      <PanelForm
        open={ubah != null}
        onOpenChange={(o) => !o && setUbah(null)}
        tampilan="dialog"
        size="lg"
        title={`Ubah ${(label[ubah ?? ''] ?? '').toLowerCase()}`}
        description="Data ini dikirim ke PDDikti. Pastikan sesuai KTP/KK."
        berubah={daftarUbah.some((x) => (isi[x.kode] ?? '') !== (x.nilai ?? ''))}
        labelSimpan="Simpan"
        onSimpan={async () => {
          const body = Object.fromEntries(daftarUbah.filter((x) => (isi[x.kode] ?? '') !== (x.nilai ?? '')).map((x) => [x.kode, (isi[x.kode] ?? '').trim()]));
          if (!Object.keys(body).length) return;
          try {
            await siakad.request({ method: 'POST', path: '/v1/profil/saya/data-pribadi', body });
            invalidateSiakad('profil');
            invalidateSiakad('kelengkapan');
          } catch (e) {
            const f = (e as { fields?: Record<string, unknown> }).fields;
            if (f) {
              setSalah(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
              return 'Periksa isian yang ditandai.';
            }
            throw e;
          }
        }}
      >
        <GridForm>
          {daftarUbah.map((x) => (
            <IsianDataPribadiSaya
              key={x.kode}
              isian={x}
              value={isi[x.kode] ?? ''}
              error={salah[x.kode]}
              onChange={(v) => {
                setIsi((n) => ({ ...n, [x.kode]: v }));
                setSalah((g) => (g[x.kode] ? { ...g, [x.kode]: '' } : g));
              }}
            />
          ))}
        </GridForm>
      </PanelForm>
      <ModalFitur
        open={ajukan != null}
        onOpenChange={(o) => !o && setAjukan(null)}
        size="md"
        ilustrasi="surat-layanan"
        title={`Ajukan perubahan ${ajukan?.label.toLowerCase() ?? ''}`}
        description="Petugas BAK/SDM memeriksa permohonan dan memperbarui data di SIAKAD. Lampirkan bukti (akta, KK, ijazah) dari aplikasi profil setelah terkirim."
        tutup="Batal"
        aksi={{
          label: 'Kirim permohonan',
          onClick: async () => {
            if (!baru.trim() || !alasan.trim()) return 'Isi nilai baru dan alasan.';
            await siakad.request({ method: 'POST', path: '/v1/profil/permohonan', body: { username: d.akun.username, kolom: ajukan!.kode, nilai_baru: baru.trim(), alasan: alasan.trim() } });
            invalidateSiakad('profil');
          },
        }}
      >
        <DescriptionList items={[{ label: 'Nilai sekarang', value: ajukan?.tampil ?? '-' }]} />
        <Field label="Nilai baru" required>
          {ajukan?.jenis === 'tanggal' ? (
            <IsianTanggal value={baru || null} onValueChange={setBaru} />
          ) : ajukan?.jenis === 'jenis_kelamin' ? (
            <Pilihan
              required
              value={baru || null}
              onValueChange={(v) => setBaru(v ?? '')}
              options={[
                { value: 'L', label: 'Laki-laki' },
                { value: 'P', label: 'Perempuan' },
              ]}
            />
          ) : (
            <Input value={baru} maxLength={255} onChange={(e) => setBaru(e.target.value)} />
          )}
        </Field>
        <Field label="Alasan" required>
          <Textarea value={alasan} rows={3} onChange={(e) => setAlasan(e.target.value)} />
        </Field>
      </ModalFitur>
    </div>
  );
}

// ================================================================ Orang tua dan wali

export interface AnggotaKeluarga {
  hubungan: 'AYAH' | 'IBU' | 'WALI' | string;
  nama: string | null;
  tanggal_lahir?: string | null;
  pendidikan_label?: string | null;
  pekerjaan_label?: string | null;
  penghasilan_label?: string | null;
  hidup_label?: string | null;
  agama_label?: string | null;
  alamat?: string | null;
  kota?: string | null;
  propinsi?: string | null;
  pos?: string | null;
  telepon?: string | null;
  hp?: string | null;
  email?: string | null;
}

/** Orang tua dan wali mahasiswa dari GET /v1/profil/saya/keluarga (hanya baca). */
export function OrangTuaWali({ className }: { className?: string }) {
  const q = useSiakadQuery<{ berlaku: boolean; anggota: AnggotaKeluarga[] }>(['profil', 'keluarga'], (s, signal) => s.request({ method: 'GET', path: '/v1/profil/saya/keluarga' }, { signal }), {
    staleTime: 300_000,
  });
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton className={className} height={220} />;
  if (!q.data.anggota.length) return <KosongIlus nama="wali-mahasiswa" title="Data orang tua belum diisi" description="Isi data ayah, ibu, dan wali di menu Profil Mahasiswa SIAKAD." />;
  const judul: Record<string, string> = { AYAH: 'Ayah', IBU: 'Ibu', WALI: 'Wali' };
  return (
    <div className={cn('u-modul-grid', className)}>
      {q.data.anggota.map((a) => (
        <section key={a.hubungan} className="u-modul-kartu">
          <header>
            <div className="u-modul-orang">
              <Avatar name={a.nama ?? judul[a.hubungan]} size="md" />
              <div>
                <small>{judul[a.hubungan] ?? a.hubungan}</small>
                <h4>{a.nama ?? 'Belum diisi'}</h4>
              </div>
            </div>
            {a.hidup_label && <Badge variant="outline">{a.hidup_label}</Badge>}
          </header>
          <DescriptionList
            items={[
              { label: 'Tanggal lahir', value: a.tanggal_lahir ? formatDate(a.tanggal_lahir, 'long') : '-' },
              { label: 'Pendidikan', value: a.pendidikan_label ?? '-' },
              { label: 'Pekerjaan', value: a.pekerjaan_label ?? '-' },
              { label: 'Penghasilan', value: a.penghasilan_label ?? '-' },
              {
                label: 'Kontak',
                value: (
                  <span className="u-biodata-kontak">
                    {a.hp && (
                      <span>
                        <Phone aria-hidden /> {a.hp}
                      </span>
                    )}
                    {a.email && (
                      <span>
                        <Mail aria-hidden /> {a.email}
                      </span>
                    )}
                    {!a.hp && !a.email && '-'}
                  </span>
                ),
              },
              {
                label: 'Alamat',
                value: [a.alamat, a.kota, a.propinsi, a.pos].filter(Boolean).length ? (
                  <span className="u-biodata-kontak">
                    <span>
                      <MapPin aria-hidden /> {[a.alamat, a.kota, a.propinsi, a.pos].filter(Boolean).join(', ')}
                    </span>
                  </span>
                ) : (
                  '-'
                ),
              },
            ]}
          />
        </section>
      ))}
    </div>
  );
}

// ================================================================ Riwayat (pendidikan, pekerjaan, prestasi, organisasi)

export type JenisRiwayatProfil = 'pendidikan' | 'pekerjaan' | 'prestasi' | 'organisasi';
type Tipe = 'teks' | 'panjang' | 'tanggal' | 'angka' | 'pilihan' | 'bool';
interface Kolom {
  k: string;
  label: string;
  tipe?: Tipe;
  opsi?: string[];
  wajib?: boolean;
}
const opsi = (s: string) => s.split(',');
const RIWAYAT: Record<JenisRiwayatProfil, { judul: string; ilus: NamaIlustrasi; kolom: Kolom[]; judulBaris: (r: Row) => string; sub: (r: Row) => string; waktu: (r: Row) => string }> = {
  pendidikan: {
    judul: 'Riwayat pendidikan',
    ilus: 'kelulusan-saya',
    kolom: [
      { k: 'jenjang', label: 'Jenjang', tipe: 'pilihan', opsi: opsi('SD,SMP,SMA,D1,D2,D3,D4,S1,S2,S3,PROFESI,SPESIALIS,NONFORMAL'), wajib: true },
      { k: 'institusi', label: 'Institusi', wajib: true },
      { k: 'program_studi', label: 'Program studi/jurusan' },
      { k: 'gelar', label: 'Gelar' },
      { k: 'negara', label: 'Negara' },
      { k: 'tahun_masuk', label: 'Tahun masuk', tipe: 'angka' },
      { k: 'tahun_lulus', label: 'Tahun lulus', tipe: 'angka' },
      { k: 'masih_studi', label: 'Masih studi', tipe: 'bool' },
      { k: 'ipk', label: 'IPK/nilai akhir', tipe: 'angka' },
      { k: 'nomor_ijazah', label: 'Nomor ijazah' },
      { k: 'judul_tugas_akhir', label: 'Judul tugas akhir' },
    ],
    judulBaris: (r) => `${r.jenjang ?? ''} ${r.program_studi ?? ''}`.trim() || String(r.institusi ?? ''),
    sub: (r) => [r.institusi, r.gelar].filter(Boolean).join(' · '),
    waktu: (r) => `${r.tahun_masuk ?? '?'} – ${r.masih_studi && r.masih_studi !== '0' ? 'sekarang' : (r.tahun_lulus ?? '?')}`,
  },
  pekerjaan: {
    judul: 'Riwayat pekerjaan',
    ilus: 'tendik',
    kolom: [
      { k: 'instansi', label: 'Instansi', wajib: true },
      { k: 'jabatan', label: 'Jabatan', wajib: true },
      { k: 'unit_kerja', label: 'Unit kerja' },
      { k: 'jenis', label: 'Jenis', tipe: 'pilihan', opsi: opsi('tetap,kontrak,paruh_waktu,honorer,magang,wirausaha,lepas,lainnya') },
      { k: 'sektor', label: 'Sektor', tipe: 'pilihan', opsi: opsi('pemerintah,swasta,bumn,pendidikan,nirlaba,wirausaha,internasional,lainnya') },
      { k: 'lokasi', label: 'Lokasi' },
      { k: 'mulai', label: 'Mulai', tipe: 'tanggal', wajib: true },
      { k: 'selesai', label: 'Selesai', tipe: 'tanggal' },
      { k: 'masih_bekerja', label: 'Masih bekerja di sini', tipe: 'bool' },
      { k: 'deskripsi', label: 'Deskripsi', tipe: 'panjang' },
    ],
    judulBaris: (r) => String(r.jabatan ?? ''),
    sub: (r) => [r.instansi, r.unit_kerja, r.lokasi].filter(Boolean).join(' · '),
    waktu: (r) => `${r.mulai ? formatDate(String(r.mulai), 'medium') : '?'} – ${r.masih_bekerja && r.masih_bekerja !== '0' ? 'sekarang' : r.selesai ? formatDate(String(r.selesai), 'medium') : '?'}`,
  },
  prestasi: {
    judul: 'Prestasi dan sertifikasi',
    ilus: 'nilai',
    kolom: [
      { k: 'jenis', label: 'Jenis', tipe: 'pilihan', opsi: opsi('penghargaan,sertifikasi,pelatihan,kompetisi,publikasi,lainnya'), wajib: true },
      { k: 'judul', label: 'Judul', wajib: true },
      { k: 'penyelenggara', label: 'Penyelenggara' },
      { k: 'tingkat', label: 'Tingkat', tipe: 'pilihan', opsi: opsi('internal,lokal,provinsi,nasional,internasional') },
      { k: 'peringkat', label: 'Peringkat/capaian' },
      { k: 'tanggal', label: 'Tanggal', tipe: 'tanggal' },
      { k: 'berlaku_sampai', label: 'Berlaku sampai', tipe: 'tanggal' },
      { k: 'nomor_sertifikat', label: 'Nomor sertifikat' },
      { k: 'tautan', label: 'Tautan bukti' },
      { k: 'keterangan', label: 'Keterangan', tipe: 'panjang' },
    ],
    judulBaris: (r) => String(r.judul ?? ''),
    sub: (r) => [r.jenis, r.tingkat, r.peringkat, r.penyelenggara].filter(Boolean).join(' · '),
    waktu: (r) => (r.tanggal ? formatDate(String(r.tanggal), 'medium') : ''),
  },
  organisasi: {
    judul: 'Organisasi',
    ilus: 'maba',
    kolom: [
      { k: 'nama_organisasi', label: 'Nama organisasi', wajib: true },
      { k: 'jabatan', label: 'Jabatan' },
      { k: 'jenis', label: 'Jenis', tipe: 'pilihan', opsi: opsi('kemahasiswaan,profesi,kemasyarakatan,kepanitiaan,relawan,lainnya') },
      { k: 'mulai', label: 'Mulai', tipe: 'tanggal' },
      { k: 'selesai', label: 'Selesai', tipe: 'tanggal' },
      { k: 'masih_aktif', label: 'Masih aktif', tipe: 'bool' },
      { k: 'keterangan', label: 'Keterangan', tipe: 'panjang' },
    ],
    judulBaris: (r) => String(r.nama_organisasi ?? ''),
    sub: (r) => [r.jabatan, r.jenis].filter(Boolean).join(' · '),
    waktu: (r) => `${r.mulai ? formatDate(String(r.mulai), 'medium') : '?'} – ${r.masih_aktif && r.masih_aktif !== '0' ? 'sekarang' : r.selesai ? formatDate(String(r.selesai), 'medium') : '?'}`,
  },
};
type Row = Record<string, any>;
const label_ = (s: string) => s.replace(/_/g, ' ');

/**
 * Riwayat milik sendiri (pendidikan, pekerjaan, prestasi, organisasi) dari /v1/profil/{jenis}?username=…: linimasa
 * dengan tambah, ubah, dan hapus. Formulir mengikuti kolom tabel profil_riwayat_*; server memvalidasi ulang.
 */
export interface RiwayatProfilSayaProps {
  jenis: JenisRiwayatProfil;
  /**
   * Judul di atas linimasa (bawaan nama riwayat). `false` menyembunyikan judul (mis. halaman sudah punya PageHeader);
   * tombol Tambah tetap tampil di kanan.
   */
  judul?: React.ReactNode | false;
  /** Tombol "Bukti & lampiran" per baris: unggah dan hapus berkas lewat /v1/profil/{jenis}/{id}/berkas (LampiranProfil). */
  lampiran?: Omit<LampiranProfilProps, 'path' | 'id' | 'berkas' | 'className'>;
  className?: string;
}

export function RiwayatProfilSaya({ jenis, judul, lampiran, className }: RiwayatProfilSayaProps) {
  const siakad = useSiakad();
  const akun = useAkunSaya({ foto: false });
  const username = akun.data?.akun.username;
  const def = RIWAYAT[jenis];
  const q = useSiakadQuery<Row[]>(['profil', jenis, username], (s, signal) => s.request<Row[]>({ method: 'GET', path: `/v1/profil/${jenis}`, query: { username, per_page: 100 } }, { signal }), {
    enabled: Boolean(username),
  });
  const [form, setFormMentah] = React.useState<Row | null>(null);
  const [formAwal, setFormAwal] = React.useState<Row | null>(null);
  const setForm: React.Dispatch<React.SetStateAction<Row | null>> = setFormMentah;
  const bukaForm = (r: Row) => {
    setFormAwal(r);
    setFormMentah(r);
  };
  const [hapus, setHapus] = React.useState<Row | null>(null);
  const [berkas, setBerkas] = React.useState<Row | null>(null);
  const [salah, setSalah] = React.useState<Record<string, string>>({});
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  if (!q.data) return <Skeleton className={className} height={200} />;
  const tambah = (
    <Button
      size="sm"
      onClick={() => {
        setSalah({});
        bukaForm({});
      }}
    >
      <Plus /> Tambah
    </Button>
  );
  return (
    <div className={cn('u-modul-riwayat', className)}>
      {q.data.length === 0 ? (
        <KosongIlus nama={def.ilus} title={`Belum ada ${def.judul.toLowerCase()}`} description="Tambahkan agar profil Anda lengkap untuk tracer study, karier, dan beasiswa." actions={tambah} />
      ) : (
        <>
          <header className="u-modul-riwayat-kepala">
            {judul === false ? <span /> : <h4>{judul ?? def.judul}</h4>}
            {tambah}
          </header>
          <ol className="u-modul-linimasa">
            {q.data.map((r) => (
              <li key={r.id}>
                <span className="u-modul-titik" aria-hidden />
                <div>
                  <b>{def.judulBaris(r)}</b>
                  <span>{def.sub(r)}</span>
                  <small>{def.waktu(r)}</small>
                </div>
                <div className="u-modul-aksi">
                  {lampiran && (
                    <Button size="xs" variant="ghost" iconOnly aria-label="Bukti & lampiran" onClick={() => setBerkas(r)}>
                      <Paperclip />
                    </Button>
                  )}
                  <Button
                    size="xs"
                    variant="ghost"
                    iconOnly
                    aria-label="Ubah"
                    onClick={() => {
                      setSalah({});
                      bukaForm({ ...r });
                    }}
                  >
                    <Pencil />
                  </Button>
                  <Button size="xs" variant="ghost" iconOnly aria-label="Hapus" onClick={() => setHapus(r)}>
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
      <PanelForm
        open={form != null}
        onOpenChange={(o) => !o && setForm(null)}
        tampilan="dialog"
        size="lg"
        title={form?.id ? `Ubah ${def.judul.toLowerCase()}` : `Tambah ${def.judul.toLowerCase()}`}
        berubah={form != null && JSON.stringify(form) !== JSON.stringify(formAwal)}
        labelSimpan={form?.id ? 'Simpan perubahan' : 'Tambah'}
        onSimpan={async () => {
          const body: Row = { username };
          for (const c of def.kolom) {
            const v = form?.[c.k];
            body[c.k] = c.tipe === 'bool' ? (v && v !== '0' ? 1 : 0) : v === '' || v == null ? null : c.tipe === 'angka' ? Number(v) : v;
          }
          const kurang = Object.fromEntries(def.kolom.filter((c) => c.wajib && (body[c.k] == null || body[c.k] === '')).map((c) => [c.k, `${c.label} wajib diisi`]));
          setSalah(kurang);
          if (Object.keys(kurang).length) return 'Lengkapi isian yang ditandai.';
          try {
            await siakad.request({ method: 'POST', path: form?.id ? `/v1/profil/${jenis}/${form.id}/ubah` : `/v1/profil/${jenis}`, body });
            invalidateSiakad('profil');
          } catch (e) {
            const f = (e as { fields?: Record<string, unknown> }).fields;
            if (f) {
              setSalah(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
              return 'Periksa isian yang ditandai.';
            }
            throw e;
          }
        }}
      >
        <GridForm>
          {def.kolom.map((c) => {
            const v = form?.[c.k];
            const set = (x: unknown) => {
              setForm((f) => ({ ...(f ?? {}), [c.k]: x }));
              setSalah((g) => (g[c.k] ? { ...g, [c.k]: '' } : g));
            };
            // "Selesai" tidak relevan saat masih berjalan (masih bekerja/studi/aktif).
            const berjalan = def.kolom.find((x) => x.tipe === 'bool' && /^masih_/.test(x.k));
            const mati = c.k === 'selesai' || c.k === 'tahun_lulus' ? Boolean(berjalan && form?.[berjalan.k] && form[berjalan.k] !== '0') : false;
            if (c.tipe === 'bool')
              return (
                <Field key={c.k} className="u-form-lebar" error={salah[c.k]}>
                  <span className="u-isian-saklar">
                    <Switch checked={Boolean(v && v !== '0')} onCheckedChange={(x) => set(x ? 1 : 0)} aria-label={c.label} />
                    <span>{c.label}</span>
                  </span>
                </Field>
              );
            return (
              <Field key={c.k} label={c.label} required={c.wajib} optional={!c.wajib} error={salah[c.k]} className={c.tipe === 'panjang' ? 'u-form-lebar' : undefined}>
                {c.tipe === 'pilihan' ? (
                  <Pilihan
                    required={c.wajib}
                    value={v ? String(v) : null}
                    onValueChange={set}
                    options={(c.opsi ?? []).map((o) => ({ value: o, label: label_(o).replace(/^./, (h) => h.toUpperCase()) }))}
                  />
                ) : c.tipe === 'panjang' ? (
                  <Textarea value={v ?? ''} rows={3} onChange={(e) => set(e.target.value)} />
                ) : c.tipe === 'tanggal' ? (
                  <IsianTanggal value={v ? String(v) : null} onValueChange={set} disabled={mati} placeholder={mati ? 'Masih berjalan' : undefined} />
                ) : (
                  <Input
                    type={c.tipe === 'angka' ? 'number' : 'text'}
                    inputMode={c.tipe === 'angka' ? (c.k === 'ipk' ? 'decimal' : 'numeric') : undefined}
                    step={c.k === 'ipk' ? '0.01' : undefined}
                    value={v ?? ''}
                    disabled={mati}
                    placeholder={mati ? 'Masih berjalan' : undefined}
                    onChange={(e) => set(e.target.value)}
                  />
                )}
              </Field>
            );
          })}
        </GridForm>
      </PanelForm>
      <ConfirmDialog
        open={hapus != null}
        onOpenChange={(o) => !o && setHapus(null)}
        title={`Hapus "${hapus ? def.judulBaris(hapus) : ''}"?`}
        description="Riwayat dan lampirannya dihapus dari profil Anda."
        confirmLabel="Hapus riwayat"
        tone="danger"
        onConfirm={async () => {
          await siakad.request({ method: 'POST', path: `/v1/profil/${jenis}/${hapus!.id}/hapus` });
          invalidateSiakad('profil');
        }}
      />
      {lampiran && (
        <Dialog
          open={berkas != null}
          onOpenChange={(o) => !o && setBerkas(null)}
          title="Bukti & lampiran"
          description={berkas ? [def.judulBaris(berkas), def.sub(berkas)].filter(Boolean).join(' · ') : undefined}
          size="md"
        >
          {berkas && <LampiranProfil path={jenis} id={berkas.id} {...lampiran} />}
        </Dialog>
      )}
    </div>
  );
}

// ================================================================ Lampiran baris profil

/** Satu berkas yang melekat pada baris profil (dokumen, riwayat, permohonan). */
export interface BerkasProfil {
  uuid: string;
  jenis?: string;
  nama: string;
  mime?: string;
  ukuran: number;
  created_at?: string | null;
}

export interface LampiranProfilProps {
  /** Jenis baris di /v1/profil, mis. `dokumen`, `pendidikan`, `permohonan`. */
  path: string;
  id: number | string;
  /** Berkas yang sudah diketahui. Bila kosong, diambil dari GET /v1/profil/{path}/{id}. */
  berkas?: BerkasProfil[];
  /** Hanya lihat (mis. dokumen terverifikasi, petugas verifikasi): tanpa unggah dan hapus. */
  terkunci?: boolean;
  /** Batas ukuran per berkas (MB). Bawaan 20. */
  maksMb?: number;
  /** Tipe berkas yang diterima. Bawaan PDF, JPG, PNG, WEBP. */
  accept?: string;
  /** Jenis berkas yang dikirim saat unggah (bawaan `utama`). */
  jenisUnggah?: string;
  judulUnggah?: React.ReactNode;
  keterangan?: React.ReactNode;
  /**
   * Alamat untuk membuka berkas di tab baru (mis. lewat BFF: `/bff/api/v1/profil/{path}/{id}/berkas/{uuid}`). Tanpa
   * ini, nama berkas tidak bertaut.
   */
  urlBerkas?: (path: string, id: number | string, uuid: string) => string;
  /** Dipanggil setelah unggah atau hapus berhasil. */
  onBerubah?: () => void;
  className?: string;
}

/**
 * Panel lampiran satu baris profil: daftar berkas (buka di tab baru, hapus dengan konfirmasi) dan unggah lewat
 * Dropzone ke POST /v1/profil/{path}/{id}/berkas (multipart). Dipakai DokumenSaya, RiwayatProfilSaya, dan antrean
 * verifikasi petugas.
 */
export function LampiranProfil({
  path,
  id,
  berkas: berkasProp,
  terkunci,
  maksMb = 20,
  accept = 'application/pdf,image/jpeg,image/png,image/webp',
  jenisUnggah = 'utama',
  judulUnggah,
  keterangan,
  urlBerkas,
  onBerubah,
  className,
}: LampiranProfilProps) {
  const siakad = useSiakad();
  const toast = useToast();
  const q = useSiakadQuery<{ berkas?: BerkasProfil[] }>(
    ['profil', path, 'rinci', id],
    (s, signal) => s.request<{ berkas?: BerkasProfil[] }>({ method: 'GET', path: `/v1/profil/${path}/${id}` }, { signal }),
    {
      enabled: berkasProp === undefined,
      staleTime: 0,
    },
  );
  const [unggah, setUnggah] = React.useState(false);
  const [galat, setGalat] = React.useState<string | null>(null);
  const [hapus, setHapus] = React.useState<BerkasProfil | null>(null);
  const daftar = berkasProp ?? q.data?.berkas;
  const segarkan = () => {
    if (berkasProp === undefined) q.refetch();
    invalidateSiakad('profil');
    onBerubah?.();
  };
  const kirim = async (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setGalat(null);
    setUnggah(true);
    try {
      await siakad.request({ method: 'POST', path: `/v1/profil/${path}/${id}/berkas`, body: { berkas: f, jenis: jenisUnggah }, multipart: true });
      toast.add({ title: `${f.name} terunggah`, type: 'success' });
      segarkan();
    } catch (e) {
      setGalat(pesanGalat(e));
    } finally {
      setUnggah(false);
    }
  };
  if (q.error && berkasProp === undefined) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  return (
    <div className={cn('u-lampiran-profil', className)}>
      {!daftar ? (
        <Skeleton height={56} />
      ) : daftar.length > 0 ? (
        <FileList
          files={daftar.map((b) => ({ id: b.uuid, name: b.nama, size: b.ukuran, url: urlBerkas?.(path, id, b.uuid) }))}
          onRemove={terkunci ? undefined : (uuid) => setHapus(daftar.find((b) => b.uuid === uuid) ?? null)}
        />
      ) : terkunci ? (
        <Alert variant="warning">Belum ada berkas terlampir.</Alert>
      ) : null}
      {galat && <Alert variant="danger">{galat}</Alert>}
      {!terkunci && (
        <Dropzone
          onFiles={(f) => void kirim(f)}
          accept={accept}
          maxSize={maksMb * 1024 * 1024}
          disabled={unggah}
          title={unggah ? 'Mengunggah…' : (judulUnggah ?? (daftar?.length ? 'Tambah berkas' : undefined))}
          hint={keterangan ?? `PDF, JPG, PNG, atau WEBP, maksimal ${maksMb} MB`}
          onReject={setGalat}
        />
      )}
      <ConfirmDialog
        open={hapus != null}
        onOpenChange={(o) => !o && setHapus(null)}
        title="Hapus berkas ini?"
        description={hapus?.nama}
        confirmLabel="Hapus berkas"
        tone="danger"
        onConfirm={async () => {
          try {
            await siakad.request({ method: 'POST', path: `/v1/profil/${path}/${id}/berkas/${hapus!.uuid}/hapus` });
            toast.add({ title: 'Berkas dihapus', type: 'success' });
            segarkan();
          } catch (e) {
            toast.add({ title: 'Gagal menghapus', description: pesanGalat(e), type: 'error' });
          }
        }}
      />
    </div>
  );
}

// ================================================================ Keuangan mahasiswa (UKT)

export interface ItemTagihanMahasiswa {
  kode_biaya: string | number;
  jenis_biaya: string;
  tagihan: number;
  dibayar: number;
  potongan: number;
  sisa: number;
  pembayaran: Array<{ id: number; tanggal: string; jumlah: number; diskon?: number | null; keterangan?: string | null }>;
}
export interface KeuanganMahasiswaData {
  nim: string;
  periode: Array<{ tahun_id: string; item: ItemTagihanMahasiswa[]; ringkasan: { tagihan: number; dibayar: number; potongan: number; sisa: number } }>;
  ringkasan: { tagihan: number; dibayar: number; potongan: number; sisa: number };
  deposit?: number | { saldo?: number } | null;
  invoice_aktif?: Array<{ id: number; nomor: string; tahun_id: string; jumlah: number; berlaku_sampai?: string | null }>;
  dispensasi?: Array<{ id: number; tahun_id: string; untuk: string; janji_bayar?: string | null; status: string }>;
}

/**
 * Riwayat keuangan mahasiswa (UKT dan biaya lain) dari GET /v1/keuangan/mahasiswa/{nim}: total tagihan, dibayar,
 * potongan, sisa; tagihan per periode beserta pembayarannya; invoice aktif dan dispensasi. Sama dengan menu
 * Riwayat Keuangan SIAKAD.
 */
export function KeuanganMahasiswa({ nim: nimProp, className }: { nim?: string; className?: string }) {
  const akun = useAkunSaya({ foto: false });
  const nim = nimProp ?? akun.data?.akun.username;
  const q = useSiakadQuery<KeuanganMahasiswaData>(
    ['keuangan', 'mahasiswa', nim],
    (s, signal) => s.request<KeuanganMahasiswaData>({ method: 'GET', path: `/v1/keuangan/mahasiswa/${encodeURIComponent(nim!)}` }, { signal }),
    {
      enabled: Boolean(nim),
    },
  );
  const [buka, setBuka] = React.useState<string | null>(null);
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={260} />;
  if (!d.periode.length) return <KosongIlus nama="pembayaran" title="Belum ada tagihan" description="Tagihan UKT akan muncul di sini setelah dibuat biro keuangan." />;
  const r = d.ringkasan;
  const persen = r.tagihan > 0 ? Math.min(100, Math.round(((r.dibayar + r.potongan) / r.tagihan) * 100)) : 100;
  const periode = [...d.periode].sort((a, b) => b.tahun_id.localeCompare(a.tahun_id));
  const aktif = buka ?? periode[0]?.tahun_id;
  return (
    <div className={cn('u-modul-keu', className)}>
      <div className="u-modul-keu-ringkas">
        <Ilustrasi nama={r.sisa > 0 ? 'pembayaran' : 'sukses'} lebar={150} ekspresi={r.sisa > 0 ? 'datar' : 'senang'} />
        <div>
          <dl className="u-modul-angka">
            <div>
              <dt>Total tagihan</dt>
              <dd>{formatRupiah(r.tagihan)}</dd>
            </div>
            <div>
              <dt>Dibayar</dt>
              <dd>{formatRupiah(r.dibayar)}</dd>
            </div>
            <div>
              <dt>Potongan</dt>
              <dd>{formatRupiah(r.potongan)}</dd>
            </div>
            <div data-nada={r.sisa > 0 ? 'bahaya' : 'baik'}>
              <dt>Sisa</dt>
              <dd>{formatRupiah(r.sisa)}</dd>
            </div>
          </dl>
          <ProgressBertumpuk
            label={`Terbayar ${persen}%`}
            total={r.tagihan}
            legenda={false}
            bagian={[
              { label: 'Dibayar', nilai: r.dibayar, tone: 'success' },
              { label: 'Potongan', nilai: r.potongan, tone: 'info' },
            ]}
          />
        </div>
      </div>
      {(d.invoice_aktif ?? []).length > 0 && (
        <Alert variant="info" title="Tagihan menunggu pembayaran">
          {d.invoice_aktif!.map((i) => (
            <div key={i.id}>
              <span className="u-mono">{i.nomor}</span> · {formatRupiah(i.jumlah)}
              {i.berlaku_sampai ? ` · bayar sebelum ${formatDate(i.berlaku_sampai, 'medium')}` : ''}
            </div>
          ))}
        </Alert>
      )}
      <ol className="u-modul-periode">
        {periode.map((p) => {
          const terbuka = p.tahun_id === aktif;
          return (
            <li key={p.tahun_id} data-terbuka={terbuka || undefined}>
              <button type="button" aria-expanded={terbuka} onClick={() => setBuka(terbuka ? '' : p.tahun_id)}>
                <b>{labelTahunAkademik(p.tahun_id)}</b>
                <span>{formatRupiah(p.ringkasan.tagihan)}</span>
                {p.ringkasan.sisa > 0 ? <Badge variant="warning">Sisa {formatRupiah(p.ringkasan.sisa)}</Badge> : <Badge variant="success">Lunas</Badge>}
              </button>
              {terbuka && (() => {
                const rb = rincianDariKeuanganMahasiswa({ periode: [p] });
                return (
                  <RincianPembayaran
                    varian="lengkap"
                    judul={`Rincian pembayaran ${labelTahunAkademik(p.tahun_id)}`}
                    rincian={rb.rincian}
                    riwayat={rb.riwayat}
                    ringkasan={{ biaya: p.ringkasan.tagihan, potongan: p.ringkasan.potongan, dibayar: p.ringkasan.dibayar, sisa: p.ringkasan.sisa }}
                  />
                );
              })()}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

// ================================================================ Kepegawaian (dosen, tendik)

export interface PegawaiSaya {
  id: number;
  nama_lengkap: string;
  jenis: string;
  nidn?: string | null;
  nip?: string | null;
  unit_nama?: string | null;
  jabatan_akademik?: string | null;
  golongan?: string | null;
  pangkat?: string | null;
  status_kepegawaian?: string | null;
  tmt_masuk?: string | null;
  masa_kerja?: { tahun: number; bulan: number } | null;
  tanggal_pensiun_perkiraan?: string | null;
  serdos?: boolean;
  atasan_nama?: string | null;
  jabatan_aktif?: Array<{ id: number; jabatan: string; nama_jabatan?: string | null; unit?: string | null; tmt_mulai: string; tmt_selesai?: string | null }>;
  jumlah_riwayat?: Record<string, number>;
  menunggu_verifikasi?: number | Record<string, number>;
}
const JUDUL_RIWAYAT_SDM: Record<string, string> = {
  'jabatan-akademik': 'Jabatan akademik',
  pangkat: 'Pangkat/golongan',
  jabatan: 'Jabatan',
  status: 'Status kepegawaian',
  pendidikan: 'Pendidikan formal',
  diklat: 'Diklat',
  sertifikasi: 'Sertifikasi',
  penghargaan: 'Penghargaan',
  keluarga: 'Keluarga',
  tes: 'Tes bahasa',
  disiplin: 'Hukuman disiplin',
  pekerjaan: 'Pengalaman kerja',
  organisasi: 'Organisasi profesi',
  gaji: 'Gaji berkala',
  tunjangan: 'Tunjangan',
  unit: 'Unit kerja',
};

/**
 * Ringkasan kepegawaian pemilik token dari GET /v1/sdm/saya: jabatan akademik, pangkat/golongan, unit, masa kerja,
 * perkiraan pensiun, serdos, jabatan aktif, dan jumlah riwayat per jenis (riwayat dibuka per jenis dari
 * /v1/sdm/pegawai/{id}/{jenis}).
 */
export function KepegawaianSaya({ className }: { className?: string }) {
  const q = useSiakadQuery<PegawaiSaya>(['sdm', 'saya'], (s, signal) => s.request<PegawaiSaya>({ method: 'GET', path: '/v1/sdm/saya' }, { signal }), { staleTime: 120_000 });
  const [jenis, setJenis] = React.useState<string | null>(null);
  const r = useSiakadQuery<Row[]>(['sdm', 'riwayat', q.data?.id, jenis], (s, signal) => s.request<Row[]>({ method: 'GET', path: `/v1/sdm/pegawai/${q.data!.id}/${jenis}` }, { signal }), {
    enabled: Boolean(q.data?.id && jenis),
  });
  if (q.error)
    return (q.error as { status?: number }).status === 404 ? (
      <KosongIlus nama="tendik" title="Belum terdaftar sebagai pegawai" description="Data kepegawaian Anda belum ada di modul SDM. Hubungi biro SDM." />
    ) : (
      <GalatApi error={q.error} onRetry={q.refetch} className={className} />
    );
  const p = q.data;
  if (!p) return <Skeleton className={className} height={260} />;
  const mk = p.masa_kerja ? `${p.masa_kerja.tahun} tahun ${p.masa_kerja.bulan} bulan` : '-';
  return (
    <div className={cn('u-modul-grid', className)}>
      <section className="u-modul-kartu">
        <header>
          <h4>
            <IdCard aria-hidden /> Kepegawaian
          </h4>
          {p.serdos && (
            <Badge variant="success">
              <BadgeCheck /> Serdos
            </Badge>
          )}
        </header>
        <DescriptionList
          items={[
            { label: 'Jenis', value: label_(p.jenis) },
            { label: 'Unit', value: p.unit_nama ?? '-' },
            ...(p.nidn ? [{ label: 'NIDN', value: <span className="u-mono">{p.nidn}</span> }] : []),
            ...(p.nip ? [{ label: 'NIP', value: <span className="u-mono">{p.nip}</span> }] : []),
            ...(p.jabatan_akademik ? [{ label: 'Jabatan akademik', value: p.jabatan_akademik }] : []),
            { label: 'Pangkat/golongan', value: [p.pangkat, p.golongan].filter(Boolean).join(', ') || '-' },
            { label: 'Masa kerja', value: mk },
            { label: 'Perkiraan pensiun', value: p.tanggal_pensiun_perkiraan ? formatDate(p.tanggal_pensiun_perkiraan, 'long') : '-' },
            ...(p.atasan_nama ? [{ label: 'Atasan', value: p.atasan_nama }] : []),
          ]}
        />
      </section>
      <section className="u-modul-kartu">
        <header>
          <h4>
            <Briefcase aria-hidden /> Jabatan aktif
          </h4>
        </header>
        {(p.jabatan_aktif ?? []).length ? (
          <ol className="u-modul-linimasa">
            {p.jabatan_aktif!.map((j) => (
              <li key={j.id}>
                <span className="u-modul-titik" aria-hidden />
                <div>
                  <b>{j.nama_jabatan || j.jabatan}</b>
                  <span>{j.unit ?? ''}</span>
                  <small>
                    {formatDate(j.tmt_mulai, 'medium')} – {j.tmt_selesai ? formatDate(j.tmt_selesai, 'medium') : 'sekarang'}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className="u-muted">Tidak ada jabatan struktural/tugas tambahan aktif.</p>
        )}
      </section>
      <section className="u-modul-kartu u-modul-penuh">
        <header>
          <h4>Riwayat kepegawaian</h4>
        </header>
        <div className="u-modul-chip">
          {Object.entries(p.jumlah_riwayat ?? {}).map(([k, n]) => (
            <Button key={k} size="sm" variant={jenis === k ? 'primary' : 'outline'} onClick={() => setJenis(jenis === k ? null : k)}>
              {JUDUL_RIWAYAT_SDM[k] ?? label_(k)} <Badge variant="neutral">{n}</Badge>
            </Button>
          ))}
        </div>
        {jenis &&
          (r.error ? (
            <GalatApi error={r.error} onRetry={r.refetch} />
          ) : !r.data ? (
            <Skeleton height={120} />
          ) : r.data.length === 0 ? (
            <p className="u-muted">Belum ada data.</p>
          ) : (
            <ol className="u-modul-linimasa">
              {r.data.map((x) => (
                <li key={x.id}>
                  <span className="u-modul-titik" aria-hidden />
                  <div>
                    <b>{x.nama_jabatan ?? x.jabatan ?? x.jabatan_akademik ?? x.golongan ?? x.nama ?? x.nama_pt ?? x.jenis ?? `#${x.id}`}</b>
                    <span>{[x.nomor_sk, x.jenjang, x.penyelenggara, x.unit].filter(Boolean).join(' · ')}</span>
                    <small>{x.tmt ?? x.tmt_mulai ?? x.tahun_lulus ?? x.tahun ?? x.tanggal_mulai ?? ''}</small>
                  </div>
                  {x.status_verifikasi && <Badge variant={x.status_verifikasi === 'disetujui' ? 'success' : x.status_verifikasi === 'ditolak' ? 'danger' : 'warning'}>{x.status_verifikasi}</Badge>}
                </li>
              ))}
            </ol>
          ))}
      </section>
    </div>
  );
}

// ================================================================ Penelitian & PkM (LPPM)

export interface ProfilPenelitiData {
  dosen: Row;
  profil?: Row | null;
  rekap_per_tahun: Array<{ tahun: number } & Record<string, number>>;
  kegiatan: Row[];
  luaran: Row[];
}

/** Penelitian, pengabdian, dan luaran dosen dari GET /v1/lppm/peneliti/{nidn}: ID SINTA/Scopus/Scholar, rekap per tahun, kegiatan, dan luaran. */
export function PenelitianDosen({ nidn: nidnProp, className }: { nidn?: string; className?: string }) {
  const akun = useAkunSaya({ foto: false });
  const nidn = nidnProp ?? akun.data?.akun.username;
  const q = useSiakadQuery<ProfilPenelitiData>(
    ['lppm', 'peneliti', nidn],
    (s, signal) => s.request<ProfilPenelitiData>({ method: 'GET', path: `/v1/lppm/peneliti/${encodeURIComponent(nidn!)}` }, { signal }),
    {
      enabled: Boolean(nidn),
    },
  );
  if (q.error) return <GalatApi error={q.error} onRetry={q.refetch} className={className} />;
  const d = q.data;
  if (!d) return <Skeleton className={className} height={260} />;
  const pr = d.profil ?? {};
  const id = (
    [
      ['SINTA', pr.sinta_id],
      ['Scopus', pr.scopus_id],
      ['Google Scholar', pr.scholar_id],
      ['ORCID', pr.orcid],
    ] as Array<[string, unknown]>
  ).filter(([, v]) => v);
  const pen = d.kegiatan.filter((k) => k.jenis === 'penelitian').length;
  const pkm = d.kegiatan.filter((k) => k.jenis === 'pengabdian').length;
  return (
    <div className={cn('u-modul-grid', className)}>
      <section className="u-modul-kartu u-modul-penuh">
        <div className="u-modul-keu-ringkas">
          <Ilustrasi nama="dosen" aksesori={['jas', 'kacamata', 'laptop']} tokoh="duduk" lebar={150} />
          <div>
            <dl className="u-modul-angka">
              <div>
                <dt>Penelitian</dt>
                <dd>{pen}</dd>
              </div>
              <div>
                <dt>Pengabdian</dt>
                <dd>{pkm}</dd>
              </div>
              <div>
                <dt>Luaran</dt>
                <dd>{d.luaran.length}</dd>
              </div>
              {pr.skor_sinta != null && (
                <div>
                  <dt>Skor SINTA</dt>
                  <dd>{formatNumber(Number(pr.skor_sinta))}</dd>
                </div>
              )}
            </dl>
            {id.length > 0 && (
              <div className="u-modul-chip">
                {id.map(([k, v]) => (
                  <Badge key={k} variant="outline">
                    {k}: <span className="u-mono">{String(v)}</span>
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      <section className="u-modul-kartu">
        <header>
          <h4>
            <FlaskConical aria-hidden /> Kegiatan
          </h4>
        </header>
        {d.kegiatan.length ? (
          <ol className="u-modul-linimasa">
            {d.kegiatan.slice(0, 20).map((k) => (
              <li key={k.id}>
                <span className="u-modul-titik" aria-hidden />
                <div>
                  <b>{k.judul}</b>
                  <span>{[label_(String(k.jenis ?? '')), k.skema_nama ?? k.skema, k.sumber_dana].filter(Boolean).join(' · ')}</span>
                  <small>
                    {k.tahun_pelaksanaan ?? k.tahun_usulan}
                    {k.dana_disetujui ? ` · ${formatRupiah(Number(k.dana_disetujui))}` : ''}
                  </small>
                </div>
                {k.status && <Badge variant="outline">{label_(String(k.status))}</Badge>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="u-muted">Belum ada kegiatan yang diterima.</p>
        )}
      </section>
      <section className="u-modul-kartu">
        <header>
          <h4>
            <BookOpen aria-hidden /> Luaran
          </h4>
        </header>
        {d.luaran.length ? (
          <ol className="u-modul-linimasa">
            {d.luaran.slice(0, 20).map((l) => (
              <li key={l.id}>
                <span className="u-modul-titik" aria-hidden />
                <div>
                  <b>{l.judul}</b>
                  <span>{[l.kategori, l.wadah ?? l.nama_wadah, l.peringkat].filter(Boolean).join(' · ')}</span>
                  <small>{l.tahun}</small>
                </div>
                {l.verifikasi && <Badge variant={l.verifikasi === 'terverifikasi' ? 'success' : 'outline'}>{label_(String(l.verifikasi))}</Badge>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="u-muted">Belum ada luaran.</p>
        )}
      </section>
    </div>
  );
}

// ================================================================ Modul profil (semua peran)

export type TabProfil = 'pribadi' | 'keluarga' | 'akademik' | 'keuangan' | 'pendidikan' | 'pekerjaan' | 'prestasi' | 'organisasi' | 'bimbingan' | 'mengajar' | 'kepegawaian' | 'penelitian';

export interface ModulProfilSayaProps {
  /** Batasi tab yang tampil (urutan mengikuti daftar ini). Bawaan: semua tab yang cocok dengan peran. */
  tab?: TabProfil[];
  /** Tombol di kepala profil (mis. ganti foto, unduh CV). */
  aksi?: React.ReactNode;
  className?: string;
}

const TAB_PERAN: Record<PeranProfil, TabProfil[]> = {
  mahasiswa: ['pribadi', 'keluarga', 'akademik', 'keuangan', 'pendidikan', 'prestasi', 'organisasi', 'pekerjaan'],
  alumni: ['pribadi', 'akademik', 'pekerjaan', 'pendidikan', 'prestasi', 'organisasi', 'keuangan', 'keluarga'],
  dosen: ['pribadi', 'kepegawaian', 'bimbingan', 'mengajar', 'penelitian', 'pendidikan', 'pekerjaan', 'prestasi', 'organisasi'],
  tendik: ['pribadi', 'kepegawaian', 'pendidikan', 'pekerjaan', 'prestasi', 'organisasi'],
  pengguna: ['pribadi', 'pendidikan', 'pekerjaan', 'prestasi', 'organisasi'],
};

/**
 * Modul profil siap pakai untuk semua peran: kepala profil + tab yang disusun otomatis dari peran akun
 * (/v1/profil/saya). Mahasiswa: data pribadi, orang tua/wali, akademik + riwayat studi, keuangan/UKT, riwayat.
 * Dosen: kepegawaian, mahasiswa PA, jadwal mengajar, penelitian & PkM (LPPM), riwayat. Tendik: kepegawaian, riwayat.
 */
export function ModulProfilSaya({ tab, aksi, className }: ModulProfilSayaProps) {
  const q = useProfilSaya();
  const peran = q.data?.identitas.peran ?? 'pengguna';
  const kunci = q.data?.identitas.kunci ?? '';
  const daftar = (tab ?? TAB_PERAN[peran]).filter((t) => TAB_PERAN[peran].includes(t) || tab?.includes(t));
  const [aktif, setAktif] = React.useState<TabProfil | undefined>(undefined);
  const isi: Record<TabProfil, { label: string; icon: React.ReactNode; isi: () => React.ReactNode }> = {
    pribadi: { label: 'Data pribadi', icon: <IdCard />, isi: () => <DataPribadiSaya /> },
    keluarga: { label: 'Orang tua & wali', icon: <HeartHandshake />, isi: () => <OrangTuaWali /> },
    akademik: {
      label: 'Akademik',
      icon: <GraduationCap />,
      isi: () => (
        <div className="u-modul-tumpuk">
          <DataDiriMahasiswa nim={kunci} />
          <RiwayatStudi nim={kunci} />
        </div>
      ),
    },
    keuangan: { label: 'Keuangan', icon: <Wallet />, isi: () => <KeuanganMahasiswa nim={kunci} /> },
    pendidikan: { label: 'Pendidikan', icon: <GraduationCap />, isi: () => <RiwayatProfilSaya jenis="pendidikan" /> },
    pekerjaan: { label: 'Pekerjaan', icon: <Briefcase />, isi: () => <RiwayatProfilSaya jenis="pekerjaan" /> },
    prestasi: { label: 'Prestasi', icon: <Award />, isi: () => <RiwayatProfilSaya jenis="prestasi" /> },
    organisasi: { label: 'Organisasi', icon: <Users />, isi: () => <RiwayatProfilSaya jenis="organisasi" /> },
    bimbingan: { label: 'Mahasiswa PA', icon: <Users />, isi: () => <MahasiswaBimbingan nidn={kunci} /> },
    mengajar: { label: 'Jadwal mengajar', icon: <CalendarClock />, isi: () => <JadwalMengajar nidn={kunci} /> },
    kepegawaian: { label: 'Kepegawaian', icon: <FileEdit />, isi: () => <KepegawaianSaya /> },
    penelitian: { label: 'Penelitian & PkM', icon: <FlaskConical />, isi: () => <PenelitianDosen nidn={kunci} /> },
  };
  const pilih = aktif && daftar.includes(aktif) ? aktif : daftar[0];
  const items: TabItem<TabProfil>[] = daftar.map((t) => ({ value: t, label: isi[t].label, icon: isi[t].icon }));
  return (
    <div className={cn('u-modul-profil', className)}>
      <KepalaProfilSaya aksi={aksi} />
      {q.data && (
        <>
          <Tabs items={items} value={pilih} onValueChange={setAktif} />
          <div className="u-modul-profil-isi" role="tabpanel">
            {pilih && isi[pilih].isi()}
          </div>
        </>
      )}
    </div>
  );
}
