'use client';
import * as React from 'react';
import { BookOpen, CalendarClock, CircleAlert, ClipboardCheck, Lock, Search, Sparkles, TriangleAlert, Undo2 } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Badge, Button } from '../../components/actions';
import { Alert, Empty } from '../../components/display';
import { Checkbox, Input, InputGroup, RadioGroup } from '../../components/forms';
import { useToast } from '../../components/overlays';
import { useKonfirmasi } from '../../components/aksi';
import { PanelLangkah } from '../../components/panel-langkah';
import { WizardReview } from '../../components/wizard';
import { labelTahunAkademik } from '../akademik';
import { hasilDariGalatAturan } from '../aturan';
import type { HasilAmbilKrs, KelasPenawaran, MkPenawaran, PenawaranKrs } from '../alur';
import { AlurPemeriksa, type TahapPemeriksa } from '../pemeriksa';
import { invalidateSiakad, pesanGalat, useOptionalSiakad, useSiakadQuery } from '../provider';
import { keadaanData, type KeadaanDataProps } from './bersama';
import { MENIT_PER_SKS_BAWAAN, useBebanSks, useJadwalMahasiswa } from './hooks';
import { JadwalMingguan } from './jadwal';
import { RingkasanKrs, TabelKrs, teksWaktuKuliah } from './krs';
import { adaAngka, angka, jamPendek, krsDisetujui, menitDari, namaHari, nomorHari, type BarisKrs, type DataKrs, type SesiKuliah } from './tipe';

/*
 * Form isi KRS mahasiswa (keputusan Anas 2026-11-22 13:17), pola dari fakultas `IsiKrs` dan endpoint KRS mahasiswa
 * SIAKAD: pilih mata kuliah dari penawaran (GET /v1/mahasiswa/{nim}/krs/penawaran), kelas & jadwal dengan deteksi
 * bentrok, batas SKS dari server, ringkasan, ajukan ke dosen PA (POST /v1/mahasiswa/{nim}/krs), status persetujuan,
 * dan batalkan mata kuliah yang belum disetujui (POST /v1/mahasiswa/{nim}/krs/batal).
 *
 * Ketentuan dari aturan ber-SK (masa KRS, syarat bayar, batas SKS, jumlah MK, prasyarat) TIDAK dihitung di klien:
 * komponen menampilkan `boleh_ambil`/`alasan`/`aturan` penawaran dan galat 409/422 server apa adanya. Klien hanya
 * menjumlah SKS terhadap `batas_sks` dari server dan memeriksa irisan jadwal supaya mahasiswa tahu sebelum mengajukan.
 */

type Angka = number | string | null | undefined;

// Bentuk penawaran/hasil KRS (KelasPenawaran, MkPenawaran, PenawaranKrs, HasilAmbilKrs) sama dengan komponen lama
// AmbilKrs di siakad/alur.tsx: satu definisi tipe, diekspor dari sana.
/** Ringkasan pemeriksaan aturan dinamis (Mesin::ringkas) di penawaran KRS atau galat 409. */
export type AturanKrsRingkas = NonNullable<PenawaranKrs['aturan']>;

/** Respons POST /v1/mahasiswa/{nim}/krs (semua kolom opsional untuk pemanggil sendiri). */
export type HasilAjukanKrs = Partial<HasilAmbilKrs>;

/** Pilihan mahasiswa: id mata kuliah → idj kelas (null = belum memilih kelas / MK tanpa pilihan kelas). */
export type PilihanKrs = Record<number, number | null>;

// ================================================================ Bentrok jadwal
/** Satu sesi yang diperiksa bentroknya (baris KRS, pilihan kelas, atau sesi jadwal). */
export interface SlotKuliah {
  kunci: string;
  label: string;
  hari?: string | number | null;
  jam_mulai?: string | null;
  jam_selesai?: string | null;
  jam_ke?: number | null;
  sks?: Angka;
}
export interface BentrokJadwal {
  a: SlotKuliah;
  b: SlotKuliah;
}

/** Rentang menit satu sesi; jam selesai kosong diperkirakan SKS × menitPerSks (aturan beban SKS). */
export function rentangSlot(s: SlotKuliah, menitPerSks = MENIT_PER_SKS_BAWAAN): { hari: number; mulai: number; selesai: number } | null {
  const hari = nomorHari(s.hari ?? null);
  const mulai = menitDari(s.jam_mulai);
  if (!hari || mulai == null) return null;
  const sel = menitDari(s.jam_selesai);
  return { hari, mulai, selesai: sel != null && sel > mulai ? sel : mulai + Math.max(1, angka(s.sks)) * menitPerSks };
}

/**
 * Pasangan sesi yang bentrok: hari sama dan rentang jam beririsan (jam dari m_jam server); bila salah satu tanpa jam,
 * sama hari dan jam ke-n sama (aturan bentrok KRS lama). Sesi dengan kunci sama tidak dibandingkan.
 */
export function cariBentrok(slot: ReadonlyArray<SlotKuliah>, menitPerSks = MENIT_PER_SKS_BAWAAN): BentrokJadwal[] {
  const hasil: BentrokJadwal[] = [];
  for (let i = 0; i < slot.length; i++) {
    for (let j = i + 1; j < slot.length; j++) {
      const a = slot[i]!;
      const b = slot[j]!;
      if (a.kunci === b.kunci) continue;
      const ha = nomorHari(a.hari ?? null);
      if (!ha || ha !== nomorHari(b.hari ?? null)) continue;
      const ra = rentangSlot(a, menitPerSks);
      const rb = rentangSlot(b, menitPerSks);
      const beririsan = ra && rb ? ra.mulai < rb.selesai && rb.mulai < ra.selesai : a.jam_ke != null && a.jam_ke === b.jam_ke;
      if (beririsan) hasil.push({ a, b });
    }
  }
  return hasil;
}

/** Slot dari baris KRS (GET /krs) atau sesi jadwal (GET /jadwal). */
export function slotDariKrs(m: BarisKrs | SesiKuliah): SlotKuliah {
  const r = m as BarisKrs & SesiKuliah;
  return { kunci: `mk:${r.kode_mk ?? r.idj ?? ''}`, label: r.nama_mk ?? r.kode_mk ?? 'Mata kuliah', hari: r.hari, jam_mulai: r.jam_mulai, jam_selesai: r.jam_selesai, jam_ke: r.jam_ke ?? null, sks: r.sks };
}

/** Slot dari pilihan kelas penawaran. */
export function slotDariKelas(mk: MkPenawaran, k: KelasPenawaran): SlotKuliah {
  return { kunci: `mk:${mk.kode_mk ?? mk.id}`, label: mk.nama_mk ?? mk.kode_mk ?? 'Mata kuliah', hari: k.hari, jam_mulai: k.jam_mulai, jam_selesai: k.jam_selesai, jam_ke: k.jamke ?? null, sks: mk.sks };
}

/** "Senin 07.30–09.10" dari pilihan kelas. */
export function teksWaktuKelas(k: KelasPenawaran): string {
  return teksWaktuKuliah({ hari: k.hari, jam_mulai: k.jam_mulai, jam_selesai: k.jam_selesai, jam_ke: k.jamke ?? null });
}

/** Sesi jadwal (bentuk JadwalMingguan) dari pilihan kelas, untuk pratinjau. */
export function sesiDariKelas(mk: MkPenawaran, k: KelasPenawaran, tahunId?: string | null): SesiKuliah {
  return {
    idj: k.idj,
    tahun_id: tahunId ?? null,
    kode_mk: mk.kode_mk,
    nama_mk: mk.nama_mk,
    sks: mk.sks,
    kelas: k.kelas ?? k.nama ?? null,
    hari: k.hari,
    jam_ke: k.jamke ?? null,
    jam_mulai: k.jam_mulai,
    jam_selesai: k.jam_selesai,
    ruang: k.ruang,
    nama_ruang: k.nama_ruang,
    dosen: k.nama_dosen ? { nidn: k.nidn ?? null, nama: k.nama_dosen } : (mk.dosen ?? null),
  };
}

// ================================================================ Ringkasan pilihan
export interface RingkasPilihanKrs {
  baru: MkPenawaran[];
  sksBaru: number;
  sksTerambil: number;
  total: number;
  /** Batas dari server (null = server tidak mengirim batas). */
  batas: number | null;
  lebih: boolean;
  /** MK dicentang yang wajib memilih kelas tetapi belum. */
  belumKelas: MkPenawaran[];
}

/** Jumlah SKS pilihan terhadap batas SKS dari server (bukan aturan yang dihitung di klien). */
export function ringkasPilihanKrs(p: Pick<PenawaranKrs, 'mata_kuliah' | 'sks_terambil' | 'batas_sks'>, pilihan: PilihanKrs): RingkasPilihanKrs {
  const mk = p.mata_kuliah ?? [];
  const baru = mk.filter((m) => !m.sudah_diambil && Object.prototype.hasOwnProperty.call(pilihan, m.id));
  const sksBaru = baru.reduce((a, m) => a + angka(m.sks), 0);
  const sksTerambil = p.sks_terambil != null ? angka(p.sks_terambil) : mk.filter((m) => m.sudah_diambil).reduce((a, m) => a + angka(m.sks), 0);
  const total = sksTerambil + sksBaru;
  const batas = p.batas_sks != null && adaAngka(p.batas_sks) ? Number(p.batas_sks) : null;
  return { baru, sksBaru, sksTerambil, total, batas, lebih: batas != null && total > batas, belumKelas: baru.filter((m) => m.pilih_kelas && pilihan[m.id] == null) };
}

/** Body POST /v1/mahasiswa/{nim}/krs dari pilihan. */
export function bodyAjukanKrs(pilihan: PilihanKrs): { mata_kuliah: Array<{ id: number; idj?: number }> } {
  return { mata_kuliah: Object.entries(pilihan).map(([id, idj]) => (idj == null ? { id: Number(id) } : { id: Number(id), idj })) };
}

/** Bentrok antara pilihan baru dan KRS yang sudah ada / sesama pilihan. */
export function bentrokPilihan(p: Pick<PenawaranKrs, 'mata_kuliah'>, pilihan: PilihanKrs, krsAda: ReadonlyArray<BarisKrs | SesiKuliah> = [], menitPerSks = MENIT_PER_SKS_BAWAAN): BentrokJadwal[] {
  const slot: SlotKuliah[] = krsAda.map(slotDariKrs);
  for (const m of p.mata_kuliah ?? []) {
    const idj = pilihan[m.id];
    if (m.sudah_diambil || idj == null) continue;
    const k = (m.kelas ?? []).find((x) => x.idj === idj);
    if (k) slot.push(slotDariKelas(m, k));
  }
  return cariBentrok(slot, menitPerSks);
}

/** Pesan awam hasil POST KRS (bagian yang tidak tersimpan). null = semua tersimpan. */
export function pesanHasilAjukan(h: HasilAjukanKrs | null | undefined): string | null {
  if (!h) return null;
  if (h.melebihi_batas_sks) return `Jumlah SKS melebihi batas ${h.batas_sks ?? ''} SKS. Kurangi mata kuliah lalu ajukan lagi.`;
  const bagian: string[] = [];
  if (h.bentrok?.length) bagian.push(`${h.bentrok.length} mata kuliah bentrok jadwal`);
  if (h.kelas_belum_terpilih_atau_penuh?.length) bagian.push(`${h.kelas_belum_terpilih_atau_penuh.length} mata kuliah kelasnya penuh atau belum dipilih`);
  if (!bagian.length) return null;
  return `Belum tersimpan: ${bagian.join(', ')}. Pilih kelas lain untuk mata kuliah tersebut.`;
}

// ================================================================ Peringatan aturan
/** Pelanggaran/peringatan aturan ber-SK dari server (penawaran atau galat 409), apa adanya. */
export function PesanAturanKrs({ aturan, pesan, className }: { aturan?: AturanKrsRingkas | null; pesan?: ReadonlyArray<string> | null; className?: string }) {
  const langgar = aturan?.pelanggaran ?? [];
  const ingat = aturan?.peringatan ?? [];
  const lain = (pesan ?? []).filter(Boolean);
  if (!langgar.length && !ingat.length && !lain.length) return null;
  return (
    <div className={cn('u-ak-krs-aturan', className)}>
      {langgar.length > 0 && (
        <Alert variant="danger" title="Ketentuan yang belum terpenuhi">
          <ul>
            {langgar.map((p, i) => (
              <li key={i}>{p.pesan}</li>
            ))}
          </ul>
        </Alert>
      )}
      {ingat.length > 0 && (
        <Alert variant="warning" title="Perhatikan">
          <ul>
            {ingat.map((p, i) => (
              <li key={i}>{p.pesan}</li>
            ))}
          </ul>
        </Alert>
      )}
      {lain.length > 0 && (
        <Alert variant="info" title="Catatan dari sistem akademik">
          <ul>
            {lain.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </Alert>
      )}
    </div>
  );
}

// ================================================================ Daftar pilihan mata kuliah
export interface FormIsiKrsProps {
  penawaran: PenawaranKrs;
  pilihan: PilihanKrs;
  onPilihanChange: (p: PilihanKrs) => void;
  /** Mata kuliah yang sudah di KRS (GET /krs atau /jadwal) untuk deteksi bentrok kelas. */
  krsAda?: ReadonlyArray<BarisKrs | SesiKuliah>;
  menitPerSks?: number;
  className?: string;
}

/**
 * Daftar mata kuliah penawaran per semester: centang untuk mengambil, pilih kelas (hari, jam, ruang, dosen, penuh)
 * dengan tanda bentrok, keterangan server (prasyarat, mengulang). MK yang sudah di KRS ditandai dan tidak dicentang
 * ulang (batalkan dari tabel KRS).
 */
export function FormIsiKrs({ penawaran, pilihan, onPilihanChange, krsAda = [], menitPerSks = MENIT_PER_SKS_BAWAAN, className }: FormIsiKrsProps) {
  const [q, setQ] = React.useState('');
  const mk = React.useMemo(() => penawaran.mata_kuliah ?? [], [penawaran.mata_kuliah]);
  const grup = React.useMemo(() => {
    const kata = q.trim().toLowerCase();
    const m = new Map<number, MkPenawaran[]>();
    for (const x of mk) {
      if (kata && !`${x.kode_mk ?? ''} ${x.nama_mk ?? ''} ${x.dosen ?? ''}`.toLowerCase().includes(kata)) continue;
      const s = x.semester ?? 0;
      m.set(s, [...(m.get(s) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => (a[0] || 99) - (b[0] || 99));
  }, [mk, q]);
  // Slot lain (KRS yang ada + pilihan MK lain) untuk menandai kelas yang bentrok.
  const slotLain = React.useCallback(
    (kecuali: MkPenawaran) => {
      const s: SlotKuliah[] = krsAda.map(slotDariKrs);
      for (const m of mk) {
        if (m.id === kecuali.id || m.sudah_diambil) continue;
        const idj = pilihan[m.id];
        const k = idj == null ? undefined : (m.kelas ?? []).find((x) => x.idj === idj);
        if (k) s.push(slotDariKelas(m, k));
      }
      return s;
    },
    [krsAda, mk, pilihan],
  );
  const alih = (m: MkPenawaran, centang: boolean) => {
    const n = { ...pilihan };
    if (!centang) delete n[m.id];
    else {
      const lain = slotLain(m);
      const kosongBentrok = (m.kelas ?? []).find((k) => !k.penuh && !cariBentrok([...lain, slotDariKelas(m, k)], menitPerSks).some((b) => b.a.kunci === `mk:${m.kode_mk ?? m.id}` || b.b.kunci === `mk:${m.kode_mk ?? m.id}`));
      n[m.id] = m.pilih_kelas ? (kosongBentrok?.idj ?? null) : null;
    }
    onPilihanChange(n);
  };

  return (
    <div className={cn('u-ak-isi-krs', className)}>
      <InputGroup start={<Search aria-hidden />}>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama, kode mata kuliah, atau dosen" aria-label="Cari mata kuliah" />
      </InputGroup>
      {!grup.length && <Empty icon={<BookOpen />} title={mk.length ? 'Tidak ada mata kuliah yang cocok' : 'Belum ada mata kuliah ditawarkan'} description={mk.length ? 'Coba kata kunci lain.' : 'Hubungi prodi bila mata kuliah semester ini belum muncul.'} />}
      {grup.map(([smt, daftar]) => (
        <section key={smt} className="u-ak-isi-krs-smt" aria-label={smt ? `Semester ${smt}` : 'Mata kuliah lain'}>
          <h4>{smt ? `Semester ${smt}` : 'Lainnya'}</h4>
          <ul>
            {daftar.map((m) => {
              const dipilih = Object.prototype.hasOwnProperty.call(pilihan, m.id);
              const mati = !!m.sudah_diambil || m.bisa_dipilih === false;
              const kunci = `mk:${m.kode_mk ?? m.id}`;
              const lain = dipilih && m.pilih_kelas ? slotLain(m) : [];
              const bentrokKelas = (k: KelasPenawaran) => cariBentrok([...lain, slotDariKelas(m, k)], menitPerSks).filter((b) => b.a.kunci === kunci || b.b.kunci === kunci);
              const idCentang = `krs-mk-${m.id}`;
              return (
                <li key={m.id} data-dipilih={dipilih || undefined} data-mati={mati || undefined}>
                  <label className="u-ak-isi-krs-mk" data-disabled={mati || undefined}>
                    <Checkbox checked={dipilih || !!m.sudah_diambil} disabled={mati} onCheckedChange={(v) => alih(m, v === true)} aria-describedby={`${idCentang}-meta`} />
                    <span className="u-ak-isi-krs-teks">
                      <span className="u-ak-isi-krs-nama">
                        <b>{m.nama_mk ?? m.kode_mk}</b>
                        {m.sudah_diambil && <Badge variant="success">Sudah di KRS</Badge>}
                        {m.nilai_sebelumnya && <Badge variant="warning">Mengulang · {m.nilai_sebelumnya}</Badge>}
                      </span>
                      <small id={`${idCentang}-meta`}>{[m.kode_mk, m.dosen].filter(Boolean).join(' · ')}</small>
                      {m.keterangan && (
                        <small className="u-ak-isi-krs-ket">
                          <TriangleAlert aria-hidden />
                          {m.keterangan}
                        </small>
                      )}
                    </span>
                    <span className="u-ak-isi-krs-sks">
                      {angka(m.sks)} <small>SKS</small>
                    </span>
                  </label>
                  {dipilih && m.pilih_kelas && (
                    <div className="u-ak-isi-krs-kelas">
                      {(m.kelas ?? []).length ? (
                        <RadioGroup<string>
                          aria-label={`Kelas ${m.nama_mk ?? ''}`}
                          value={pilihan[m.id] != null ? String(pilihan[m.id]) : null}
                          onValueChange={(v) => onPilihanChange({ ...pilihan, [m.id]: Number(v) })}
                          options={(m.kelas ?? []).map((k) => {
                            const b = bentrokKelas(k);
                            const lawan = b.map((x) => (x.a.kunci === kunci ? x.b.label : x.a.label));
                            return {
                              value: String(k.idj),
                              disabled: !!k.penuh,
                              label: (
                                <span className="u-ak-isi-krs-opsi">
                                  {k.kelas ? `Kelas ${k.kelas}` : (k.nama ?? `Kelas ${k.idj}`)}
                                  {k.penuh && <Badge variant="neutral">Penuh</Badge>}
                                  {!k.penuh && b.length > 0 && <Badge variant="danger">Bentrok</Badge>}
                                </span>
                              ),
                              description: [teksWaktuKelas(k) || 'Jadwal belum ditentukan', k.nama_ruang || k.ruang, k.nama_dosen, b.length ? `bentrok dengan ${lawan.join(', ')}` : null].filter(Boolean).join(' · '),
                            };
                          })}
                        />
                      ) : (
                        <p className="u-muted">Belum ada kelas dibuka untuk mata kuliah ini.</p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ================================================================ Panel wizard isi KRS
export interface PanelIsiKrsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  penawaran: PenawaranKrs;
  /** KRS yang sudah ada (GET /krs) untuk bentrok dan ringkasan. */
  krs?: DataKrs | null;
  /** Jadwal KRS yang sudah ada (GET /jadwal) untuk pratinjau mingguan; bila kosong dipakai baris KRS. */
  jadwal?: ReadonlyArray<SesiKuliah> | null;
  menitPerSks?: number;
  /** Kirim ke server; bawaan memanggil POST /v1/mahasiswa/{nim}/krs lewat SDK. */
  onAjukan?: (body: ReturnType<typeof bodyAjukanKrs>) => Promise<HasilAjukanKrs | null | undefined>;
  /** NIM untuk pemanggilan bawaan. */
  nim?: string | null;
  /** Dipanggil setelah tersimpan (sebagian atau semua). */
  onTersimpan?: (h: HasilAjukanKrs | null | undefined) => void;
}

/**
 * Isi KRS dalam panel samping bertahap: (1) pilih mata kuliah & kelas, (2) periksa jadwal mingguan dan bentrok,
 * (3) ringkasan SKS terhadap batas server lalu ajukan ke dosen PA. Galat server (aturan ber-SK 409, validasi 422,
 * bagian yang tidak tersimpan) tampil di kaki panel tanpa menutup panel.
 */
export function PanelIsiKrs({ open, onOpenChange, penawaran, krs, jadwal, menitPerSks = MENIT_PER_SKS_BAWAAN, onAjukan, nim, onTersimpan }: PanelIsiKrsProps) {
  const siakad = useOptionalSiakad();
  const toast = useToast();
  const [pilihan, setPilihan] = React.useState<PilihanKrs>({});
  const [step, setStep] = React.useState(0);
  const [aturanGalat, setAturanGalat] = React.useState<AturanKrsRingkas | null>(null);
  React.useEffect(() => {
    if (open) {
      setPilihan({});
      setStep(0);
      setAturanGalat(null);
    }
  }, [open]);
  const krsAda = React.useMemo<Array<BarisKrs | SesiKuliah>>(() => (jadwal?.length ? [...jadwal] : [...(krs?.mata_kuliah ?? [])]), [jadwal, krs]);
  const r = ringkasPilihanKrs(penawaran, pilihan);
  const bentrok = bentrokPilihan(penawaran, pilihan, krsAda, menitPerSks);
  const pratinjau = React.useMemo<SesiKuliah[]>(() => {
    const ada: SesiKuliah[] = jadwal?.length ? [...jadwal] : (krs?.mata_kuliah ?? []).map((m) => ({ ...m, dosen: m.nama_dosen ?? null }) as SesiKuliah);
    for (const m of r.baru) {
      const k = (m.kelas ?? []).find((x) => x.idj === pilihan[m.id]);
      if (k) ada.push(sesiDariKelas(m, k, penawaran.tahun_id));
    }
    return ada;
  }, [jadwal, krs, r.baru, pilihan, penawaran.tahun_id]);

  const ajukan = async (): Promise<string | null> => {
    const body = bodyAjukanKrs(pilihan);
    try {
      const h = onAjukan
        ? await onAjukan(body)
        : siakad && nim
          ? (await siakad.request<HasilAjukanKrs>({ method: 'POST', path: `/v1/mahasiswa/${encodeURIComponent(nim)}/krs`, body })).data
          : null;
      if (!onAjukan && !(siakad && nim)) return 'Pengajuan belum tersambung ke sistem akademik.';
      invalidateSiakad('mhs');
      onTersimpan?.(h);
      const sisa = pesanHasilAjukan(h);
      if (sisa) {
        // Sebagian bisa sudah tersimpan: tetap buka panel supaya mahasiswa memilih kelas lain.
        if (h?.tersimpan?.length) toast.add({ title: `${h.tersimpan.length} mata kuliah diajukan`, description: 'Sisanya belum tersimpan.', type: 'warning' });
        return sisa;
      }
      toast.add({ title: 'KRS diajukan ke dosen PA', description: 'Status berubah menjadi disetujui setelah diperiksa dosen PA.', type: 'success' });
      return null;
    } catch (e) {
      const a = hasilDariGalatAturan(e);
      if (a) setAturanGalat({ boleh: false, pelanggaran: a.pelanggaran, peringatan: a.peringatan });
      return pesanGalat(e);
    }
  };

  return (
    <PanelLangkah
      open={open}
      onOpenChange={onOpenChange}
      title={`Isi KRS ${labelTahunAkademik(penawaran.tahun_id)}`}
      description={r.batas != null ? `Batas ${r.batas} SKS menurut ketentuan kampus · sudah di KRS ${r.sksTerambil} SKS` : `Sudah di KRS ${r.sksTerambil} SKS`}
      step={step}
      onStepChange={setStep}
      finishLabel="Ajukan ke dosen PA"
      footerNote={
        <span className={cn('u-ak-isi-krs-kaki', r.lebih && 'is-lebih')}>
          {r.total} SKS{r.batas != null ? ` dari ${r.batas}` : ''} · {r.baru.length} mata kuliah baru
        </span>
      }
      onFinish={ajukan}
      steps={[
        {
          id: 'pilih',
          title: 'Pilih mata kuliah',
          description: 'Centang mata kuliah lalu pilih kelasnya.',
          icon: <BookOpen />,
          blocked: !r.baru.length ? 'Pilih paling sedikit satu mata kuliah.' : r.belumKelas.length ? `Pilih kelas untuk ${r.belumKelas.map((m) => m.nama_mk).join(', ')}.` : r.lebih ? `Melebihi batas ${r.batas} SKS. Kurangi ${r.total - (r.batas ?? 0)} SKS.` : null,
          content: (
            <div className="u-ak-isi-krs-langkah">
              <PesanAturanKrs aturan={penawaran.aturan} />
              <FormIsiKrs penawaran={penawaran} pilihan={pilihan} onPilihanChange={setPilihan} krsAda={krsAda} menitPerSks={menitPerSks} />
            </div>
          ),
        },
        {
          id: 'jadwal',
          title: 'Periksa jadwal',
          description: 'Pastikan tidak ada jadwal yang beririsan.',
          icon: <CalendarClock />,
          validate: () => (bentrok.length ? 'Masih ada jadwal bentrok. Pilih kelas lain di langkah sebelumnya.' : null),
          content: (
            <div className="u-ak-isi-krs-langkah">
              {bentrok.length ? (
                <Alert variant="danger" title={`${bentrok.length} jadwal bentrok`}>
                  <ul>
                    {bentrok.map((b, i) => (
                      <li key={i}>
                        {b.a.label} dan {b.b.label}: {namaHari(b.a.hari ?? null)}
                        {b.a.jam_mulai ? `, ${jamPendek(b.a.jam_mulai)}` : b.a.jam_ke ? `, jam ke-${b.a.jam_ke}` : ''}
                      </li>
                    ))}
                  </ul>
                </Alert>
              ) : (
                <Alert variant="success" title="Tidak ada jadwal bentrok" />
              )}
              <JadwalMingguan jadwal={pratinjau} judul="Jadwal setelah KRS diajukan" menitPerSks={menitPerSks} kosong={{ title: 'Belum ada jadwal', description: 'Kelas yang dipilih belum berjadwal.' }} />
            </div>
          ),
        },
        {
          id: 'ajukan',
          title: 'Ringkasan',
          description: 'Periksa lalu ajukan ke dosen PA.',
          icon: <ClipboardCheck />,
          blocked: r.lebih ? `Melebihi batas ${r.batas} SKS.` : null,
          content: (
            <div className="u-ak-isi-krs-langkah">
              <PesanAturanKrs aturan={aturanGalat} />
              <WizardReview
                sections={[
                  {
                    title: 'Mata kuliah yang diajukan',
                    onEdit: () => setStep(0),
                    items: r.baru.map((m) => {
                      const k = (m.kelas ?? []).find((x) => x.idj === pilihan[m.id]);
                      return { label: m.nama_mk ?? m.kode_mk ?? '', value: [`${angka(m.sks)} SKS`, k ? (k.kelas ? `Kelas ${k.kelas}` : k.nama) : null, k ? teksWaktuKelas(k) : null].filter(Boolean).join(' · ') };
                    }),
                  },
                  {
                    title: 'Beban SKS',
                    missing: r.lebih ? `Melebihi batas ${r.batas} SKS.` : undefined,
                    items: [
                      { label: 'Sudah di KRS', value: `${r.sksTerambil} SKS` },
                      { label: 'Ditambahkan', value: `${r.sksBaru} SKS` },
                      { label: 'Jumlah', value: `${r.total} SKS${r.batas != null ? ` dari batas ${r.batas} SKS` : ''}` },
                      ...(penawaran.ips_sebelumnya != null ? [{ label: 'IPS semester lalu', value: Number(penawaran.ips_sebelumnya).toFixed(2) }] : []),
                    ],
                  },
                ]}
              />
              <Alert variant="info" title="Setelah diajukan">
                KRS menunggu persetujuan dosen PA. Selama belum disetujui dan masa pengisian masih dibuka, mata kuliah bisa dibatalkan dari daftar KRS.
              </Alert>
            </div>
          ),
        },
      ]}
    />
  );
}

// ================================================================ KRS mahasiswa (terhubung)
export interface IsiKrsMahasiswaProps extends KeadaanDataProps {
  /** NIM pemilik token mahasiswa. Penawaran & pengajuan hanya untuk token mahasiswa itu sendiri. */
  nim: string;
  /** Kode prodi untuk aturan beban SKS (bawaan prodi mahasiswa dari token). */
  kodeProdi?: string | null;
  className?: string;
}

type DataKrsSaya = DataKrs & { pemeriksa?: TahapPemeriksa[] | null };

/**
 * KRS mahasiswa periode aktif, terhubung ke SIAKAD: ringkasan SKS terhadap batas server, alur persetujuan dosen PA,
 * alasan bila pengisian ditutup (masa KRS, administrasi, aturan ber-SK), tabel KRS dengan aksi "Batalkan" selama
 * belum disetujui, dan tombol Isi KRS yang membuka panel bertahap.
 */
export function IsiKrsMahasiswa({ nim, kodeProdi, className }: IsiKrsMahasiswaProps) {
  const toast = useToast();
  const { konfirmasi, elemen } = useKonfirmasi();
  const siakad = useOptionalSiakad();
  const [buka, setBuka] = React.useState(false);
  const p = encodeURIComponent(nim);
  const krs = useSiakadQuery<DataKrsSaya>(['mhs', nim, 'krs'], (s, signal) => s.request<DataKrsSaya>({ method: 'GET', path: `/v1/mahasiswa/${p}/krs` }, { signal }), { staleTime: 30_000 });
  const tawar = useSiakadQuery<PenawaranKrs>(['mhs', nim, 'krs-penawaran'], (s, signal) => s.request<PenawaranKrs>({ method: 'GET', path: `/v1/mahasiswa/${p}/krs/penawaran` }, { signal }), { staleTime: 30_000 });
  const jadwal = useJadwalMahasiswa(nim);
  const beban = useBebanSks({ prodi: kodeProdi ?? jadwal.data?.jadwal?.[0]?.kode_prodi ?? null, tahunId: krs.data?.tahun_id ?? null });
  const penawaran = tawar.data;
  const boleh = penawaran?.boleh_ambil === true;

  const keadaan = keadaanData({ memuat: krs.loading, galat: krs.error, onUlang: krs.refetch }, !!krs.data, 320, className);
  if (keadaan) return keadaan;

  const batal = async (m: BarisKrs) => {
    if (!siakad || m.idkrs == null) return;
    const ok = await konfirmasi({
      judul: `Batalkan ${m.nama_mk ?? 'mata kuliah ini'} dari KRS?`,
      keterangan: 'Mata kuliah dikeluarkan dari KRS yang menunggu persetujuan dosen PA. Anda bisa mengambilnya lagi selama masa pengisian masih dibuka.',
      label: 'Batalkan mata kuliah',
      nada: 'bahaya',
    });
    if (!ok) return;
    try {
      await siakad.request({ method: 'POST', path: `/v1/mahasiswa/${p}/krs/batal`, body: { idkrs: m.idkrs } });
      toast.add({ title: `${m.nama_mk ?? 'Mata kuliah'} dibatalkan dari KRS`, type: 'success' });
      invalidateSiakad('mhs');
    } catch (e) {
      toast.add({ title: 'Belum bisa dibatalkan', description: pesanGalat(e), type: 'error' });
    }
  };

  const tutup = penawaran && !penawaran.boleh_ambil;
  return (
    <section className={cn('u-ak-blok u-ak-krs-saya', className)}>
      {elemen}
      <RingkasanKrs krs={krs.data} batasSks={penawaran?.batas_sks ?? null} ipsSebelumnya={penawaran?.ips_sebelumnya ?? null} />
      {krs.data?.pemeriksa?.length && krs.data.mata_kuliah?.length ? <AlurPemeriksa pemeriksa={krs.data.pemeriksa} ringkas judul="Persetujuan KRS" /> : null}
      {tutup && (
        <Alert variant="neutral" icon={<Lock aria-hidden />} title="Pengisian KRS belum bisa dilakukan">
          {penawaran.alasan ?? 'Masa pengisian KRS belum dibuka.'}
        </Alert>
      )}
      {tawar.error && !penawaran ? (
        <Alert variant="warning" icon={<CircleAlert aria-hidden />} title="Penawaran mata kuliah belum bisa dimuat">
          {pesanGalat(tawar.error)}
        </Alert>
      ) : null}
      {penawaran && <PesanAturanKrs aturan={tutup ? penawaran.aturan : { peringatan: penawaran.aturan?.peringatan }} pesan={tutup ? penawaran.pesan : null} />}
      <TabelKrs
        krs={krs.data}
        aksi={
          boleh ? (
            <Button onClick={() => setBuka(true)} disabled={!penawaran}>
              <Sparkles aria-hidden /> {krs.data?.mata_kuliah?.length ? 'Tambah mata kuliah' : 'Isi KRS'}
            </Button>
          ) : undefined
        }
        aksiBaris={(m) =>
          boleh && !krsDisetujui(m) && m.idkrs != null
            ? [{ label: 'Batalkan mata kuliah', icon: <Undo2 />, destructive: true, onSelect: () => void batal(m) }]
            : []
        }
        kosong={{ title: 'KRS masih kosong', description: boleh ? 'Pilih Isi KRS untuk mengambil mata kuliah semester ini.' : 'KRS bisa diisi saat masa pengisian dibuka.' }}
      />
      {penawaran && boleh && (
        <PanelIsiKrs
          open={buka}
          onOpenChange={setBuka}
          penawaran={penawaran}
          krs={krs.data}
          jadwal={jadwal.data?.jadwal}
          menitPerSks={beban.menitPerSks}
          nim={nim}
        />
      )}
    </section>
  );
}
