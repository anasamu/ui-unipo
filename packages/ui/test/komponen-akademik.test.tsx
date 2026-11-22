import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { cariSkala, nadaNilai, normalSkala, predikatDariIpk, skalaBerlaku, type BarisSkalaNilai } from '../src/siakad/komponen-akademik/skala';
import { menitDari, namaHari, nomorHari } from '../src/siakad/komponen-akademik/tipe';
import { LencanaNilai, LegendaSkalaNilai, SebaranNilaiSkala } from '../src/siakad/komponen-akademik/bersama';
import { RingkasanKrs, TabelKrs, statusKrs, teksWaktuKuliah } from '../src/siakad/komponen-akademik/krs';
import { LembarKhs } from '../src/siakad/komponen-akademik/khs';
import { LembarTranskrip, hitungIp } from '../src/siakad/komponen-akademik/transkrip';
import { JadwalMingguan, KuliahHariIni, tataJadwal } from '../src/siakad/komponen-akademik/jadwal';
import { TahapanAkademik, keadaanTahapan, tahapanSaatIni } from '../src/siakad/komponen-akademik/tahapan';
import { PortalAkademikMahasiswa, PortalMengajarDosen } from '../src/siakad/komponen-akademik/portal';
import { UnggahBerkasAkademik } from '../src/siakad/komponen-akademik/unggah';

const html = (el: React.ReactElement) => renderToStaticMarkup(el);

// Baris m_nilai seperti respons GET /v1/referensi/skala-nilai: dua versi (20201, 20231) dan satu prodi khusus.
const M_NILAI: BarisSkalaNilai[] = [
  { kode_prodi: '', tahun_id: '20201', nilai: 'A', bobot: 4, lulus: 1, nilai_min: 80, nilai_max: 100 },
  { kode_prodi: '', tahun_id: '20201', nilai: 'B', bobot: 3, lulus: 1, nilai_min: 65, nilai_max: 79.99 },
  { kode_prodi: '', tahun_id: '20201', nilai: 'C', bobot: 2, lulus: 1, nilai_min: 50, nilai_max: 64.99 },
  { kode_prodi: '', tahun_id: '20201', nilai: 'E', bobot: 0, lulus: 0, nilai_min: 0, nilai_max: 49.99 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'A', bobot: '4.00', lulus: '1', nilai_min: 85, nilai_max: 100 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'B+', bobot: '3.50', lulus: '1', nilai_min: 75, nilai_max: 84.99 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'B', bobot: '3.00', lulus: '1', nilai_min: 65, nilai_max: 74.99 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'C', bobot: '2.00', lulus: '1', nilai_min: 50, nilai_max: 64.99 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'D', bobot: '1.00', lulus: '0', nilai_min: 40, nilai_max: 49.99 },
  { kode_prodi: '', tahun_id: '20231', nilai: 'E', bobot: '0.00', lulus: '0', nilai_min: 0, nilai_max: 39.99 },
  { kode_prodi: '86206', tahun_id: '20231', nilai: 'A', bobot: 4, lulus: 1, nilai_min: 90, nilai_max: 100 },
  { kode_prodi: '86206', tahun_id: '20231', nilai: 'T', bobot: 0, lulus: 0, nilai_min: 0, nilai_max: 89.99 },
];

describe('skala nilai dari server', () => {
  it('memilih versi terbaru yang tidak melewati periode, dan skala umum bila prodi tak punya sendiri', () => {
    expect(skalaBerlaku(M_NILAI, { tahunId: '20221' }).map((s) => s.huruf)).toEqual(['A', 'B', 'C', 'E']);
    const kini = skalaBerlaku(M_NILAI, { tahunId: '20251', prodi: '55201' });
    expect(kini.map((s) => s.huruf)).toEqual(['A', 'B+', 'B', 'C', 'D', 'E']);
    expect(kini.find((s) => s.huruf === 'D')?.lulus).toBe(false);
    expect(skalaBerlaku(M_NILAI, { prodi: '86206' }).map((s) => s.huruf)).toEqual(['A', 'T']);
  });
  it('nada mengikuti posisi bobot dan status lulus, bukan huruf', () => {
    const s = skalaBerlaku(M_NILAI, { tahunId: '20251' });
    expect(nadaNilai('A', s)).toBe('success');
    expect(nadaNilai('b+', s)).toBe('success');
    expect(nadaNilai('B', s)).toBe('primary');
    expect(nadaNilai('C', s)).toBe('warning');
    expect(nadaNilai('D', s)).toBe('danger');
    expect(nadaNilai('A', [])).toBe('neutral');
    // Skala lain (prodi 86206): "T" tidak lulus → merah walau hurufnya tidak dikenal kode.
    expect(nadaNilai('T', skalaBerlaku(M_NILAI, { prodi: '86206' }))).toBe('danger');
  });
  it('normalSkala menerima bentuk SkalaNilai alur dan SkalaNilaiKurikulum (maks)', () => {
    expect(normalSkala([{ huruf: 'B', bobot: 3, min: 65, maks: 79, lulus: true }, { huruf: 'A', bobot: 4, min: 80, maks: 100, lulus: true }]).map((s) => [s.huruf, s.max])).toEqual([
      ['A', 100],
      ['B', 79],
    ]);
    expect(cariSkala(' b ', normalSkala(M_NILAI.slice(0, 4)))?.bobot).toBe(3);
  });
  it('predikat dari m_predikat per jenjang; tanpa daftar tidak ditebak', () => {
    const p = [
      { predikat: 'Dengan pujian', bobot_min: '3.51', bobot_max: '4.00', kode_jenjang: 'C' },
      { predikat: 'Sangat memuaskan', bobot_min: '3.01', bobot_max: '3.50', kode_jenjang: 'C' },
      { predikat: 'Cum laude', bobot_min: '3.71', bobot_max: '4.00', kode_jenjang: 'B' },
    ];
    expect(predikatDariIpk(3.6, p, 'C')).toBe('Dengan pujian');
    expect(predikatDariIpk('3.2', p, 'C')).toBe('Sangat memuaskan');
    expect(predikatDariIpk(3.6, p, 'B')).toBeNull();
    expect(predikatDariIpk(3.6, [])).toBeNull();
  });
});

describe('bantuan data', () => {
  it('hari dan jam SIAKAD', () => {
    expect(nomorHari('3')).toBe(3);
    expect(nomorHari('kamis')).toBe(4);
    expect(namaHari('5')).toBe('Jumat');
    expect(menitDari('07:30:00')).toBe(450);
    expect(teksWaktuKuliah({ hari: '1', jam_mulai: '07:30:00', jam_selesai: '09:10:00' })).toBe('Senin, 07.30–09.10');
    expect(teksWaktuKuliah({ hari: '2', jam_ke: 3 })).toBe('Selasa, jam ke-3');
  });
  it('status KRS dari disetujui / status_krs', () => {
    expect(statusKrs([]).label).toBe('Belum mengisi');
    expect(statusKrs([{ disetujui: true }, { status_krs: 'T' }]).variant).toBe('success');
    expect(statusKrs([{ disetujui: true }, { disetujui: false }]).label).toBe('1 dari 2 disetujui');
  });
  it('IP dari bobot × SKS, nilai belum dirilis tidak dihitung', () => {
    expect(hitungIp([{ sks: 3, bobot: 4 }, { sks: 2, bobot: 3 }, { sks: 3, bobot: 4, nilai_ditampilkan: false }]).ip).toBeCloseTo(3.6);
  });
  it('tata jadwal: sesi bertumpuk berdampingan, rentang jam dari data, sesi tanpa jam dipisah', () => {
    const t = tataJadwal([
      { idj: 1, hari: '1', jam_mulai: '08:00', jam_selesai: '09:40', sks: 2 },
      { idj: 2, hari: '1', jam_mulai: '09:00', jam_selesai: '10:40', sks: 2 },
      { idj: 3, hari: '1', jam_mulai: '13:00', sks: 3 },
      { idj: 4, hari: '2', jam_ke: 2 },
    ]);
    expect(t.awal).toBe(480);
    expect(t.akhir).toBe(16 * 60);
    expect(t.sesi.find((s) => s.sesi.idj === 2)).toMatchObject({ lajur: 1, lajurTotal: 2 });
    expect(t.sesi.find((s) => s.sesi.idj === 3)).toMatchObject({ lajur: 0, lajurTotal: 1, selesai: 13 * 60 + 150 });
    expect(t.tanpaJam.map((s) => s.idj)).toEqual([4]);
  });
  it('keadaan tahapan dan tahapan berjalan', () => {
    const kini = new Date(2026, 10, 22, 10);
    const tahap = [
      { judul: 'KRS online', mulai: '2026-11-17', selesai: '2026-11-24' },
      { judul: 'Perkuliahan', mulai: '2026-11-25', selesai: '2027-01-10' },
      { judul: 'Pengisian EDOM', mulai: '2026-11-01', selesai: '2026-11-10' },
    ];
    expect(keadaanTahapan(tahap[0]!, kini)).toEqual({ keadaan: 'berlangsung', teks: 'Sisa 3 hari' });
    expect(keadaanTahapan(tahap[1]!, kini).teks).toBe('Mulai 3 hari lagi');
    expect(keadaanTahapan(tahap[2]!, kini).keadaan).toBe('lalu');
    expect(tahapanSaatIni(tahap, kini)?.judul).toBe('KRS online');
  });
});

describe('render komponen akademik (SSR)', () => {
  const skala = skalaBerlaku(M_NILAI, { tahunId: '20251' });
  it('LencanaNilai: warna dari skala; tanpa skala netral', () => {
    expect(html(<LencanaNilai nilai="D" skala={skala} />)).toContain('data-nada="danger"');
    expect(html(<LencanaNilai nilai="A" />)).toContain('data-nada="neutral"');
    expect(html(<LencanaNilai nilai={null} />)).toContain('data-kosong');
  });
  it('Legenda & sebaran mengikuti urutan skala', () => {
    const l = html(<LegendaSkalaNilai skala={M_NILAI} />);
    expect(l.indexOf('>A<')).toBeLessThan(l.indexOf('>E<'));
    expect(l).toContain('tidak lulus');
    const s = html(<SebaranNilaiSkala skala={skala} data={[{ nilai_huruf: 'B' }, { nilai_huruf: 'A' }, { nilai_huruf: 'A' }, { nilai_huruf: 'C', nilai_ditampilkan: false }]} />);
    expect(s.indexOf('>A<')).toBeLessThan(s.indexOf('>B<'));
    expect(s).toContain('2 MK');
    expect(s).not.toContain('>C<');
  });
  it('TabelKrs & RingkasanKrs: kosong, galat, isi dengan batas SKS server', () => {
    expect(html(<TabelKrs krs={{ tahun_id: '20251', mata_kuliah: [] }} />)).toContain('Belum mengisi KRS');
    expect(html(<TabelKrs galat={{ status: 500, message: 'x' }} />)).toContain('role="alert"');
    const krs = { tahun_id: '20251', jumlah_sks: 6, mata_kuliah: [{ idkrs: 1, kode_mk: 'INF101', nama_mk: 'Algoritma', sks: 3, hari: '1', jam_mulai: '07:30', ruang: 'R.201', disetujui: true }, { idkrs: 2, kode_mk: 'INF102', nama_mk: 'Basis Data', sks: 3, disetujui: false }] };
    const h = html(<TabelKrs krs={krs} />);
    expect(h).toContain('Algoritma');
    expect(h).toContain('Senin, 07.30');
    expect(h).toContain('Belum dijadwalkan');
    expect(h).toContain('Ganjil 2025/2026');
    const r = html(<RingkasanKrs krs={krs} batasSks={24} />);
    expect(r).toContain('6 / 24');
    expect(r).toContain('1 dari 2 disetujui');
  });
  it('LembarKhs: periode terbaru, IPS naik, belum dirilis, bagian cetak', () => {
    const periode = [
      { tahun_id: '20241', jumlah_sks: 20, ips: { nilai: 3.1 }, ipk: { nilai: 3.1, sks: 20 }, mata_kuliah: [{ kode_mk: 'A1', nama_mk: 'Kalkulus', sks: 3, nilai_huruf: 'B', bobot: 3, mutu: 9 }] },
      { tahun_id: '20242', jumlah_sks: 21, ips: { nilai: 3.45 }, ipk: { nilai: 3.28, sks: 41 }, mata_kuliah: [{ kode_mk: 'A2', nama_mk: 'Statistika', sks: 3, nilai_huruf: 'A', bobot: 4, mutu: 12 }, { kode_mk: 'A3', nama_mk: 'Etika', sks: 2, nilai_ditampilkan: false }] },
    ];
    const h = html(<LembarKhs periode={periode} skala={skala} identitas={{ nama: 'Siti Aminah', nim: '2201001', prodi: 'Informatika' }} />);
    expect(h).toContain('Genap 2024/2025');
    expect(h).toContain('3.45');
    expect(h).toContain('Naik dari semester lalu');
    expect(h).toContain('1 nilai belum dirilis');
    expect(h).toContain('u-ak-cetak-tabel');
    expect(h).toContain('Kartu Hasil Studi');
    expect(h).toContain('Siti Aminah');
    expect(html(<LembarKhs periode={[]} />)).toContain('Belum ada KHS');
    expect(html(<LembarKhs memuat />)).toContain('u-ak-kerangka');
  });
  it('LembarTranskrip: IPK, predikat dari m_predikat, SKS lulus dari server, per semester', () => {
    const data = {
      nim: '2201001',
      jumlah_sks: 6,
      jumlah_mutu: 21,
      ipk: { nilai: 3.5, sks: 6 },
      mata_kuliah: [
        { kode_mk: 'A1', nama_mk: 'Kalkulus', semester: 1, sks: 3, nilai_huruf: 'A', bobot: 4, mutu: 12 },
        { kode_mk: 'A2', nama_mk: 'Fisika', semester: 2, sks: 3, nilai_huruf: 'B', bobot: 3, mutu: 9 },
      ],
    };
    const h = html(<LembarTranskrip data={data} skala={skala} predikat={[{ predikat: 'Sangat memuaskan', bobot_min: 3.01, bobot_max: 3.5 }]} sksLulus={144} />);
    expect(h).toContain('3.50');
    expect(h).toContain('Sangat memuaskan');
    expect(h).toContain('6 / 144');
    expect(h).toContain('Semester 1');
    expect(h).toContain('Semester 2');
    expect(h).toContain('Transkrip Nilai');
    // Tanpa predikat dari server: tidak ada predikat tebakan.
    expect(html(<LembarTranskrip data={data} />)).not.toContain('memuaskan');
  });
  it('JadwalMingguan: kisi + daftar per hari, hari ini ditandai; kosong', () => {
    const jadwal = [
      { idj: 1, hari: '1', jam_mulai: '07:30:00', jam_selesai: '09:10:00', nama_mk: 'Algoritma', kode_mk: 'INF101', ruang: 'R.201', sks: 2, dosen: { nama: 'Dr. Rahmat' } },
      { idj: 2, hari: '3', jam_mulai: '10:00:00', jam_selesai: '12:30:00', nama_mk: 'Basis Data', kode_mk: 'INF204', ruang: 'Lab 2', sks: 3 },
    ];
    const h = html(<JadwalMingguan jadwal={jadwal} kini={new Date(2026, 10, 23, 8, 0)} />);
    expect(h).toContain('u-ak-kisi');
    expect(h).toContain('Dr. Rahmat');
    expect(h).toContain('Hari ini');
    expect(h).toContain('u-ak-kisi-kini');
    expect(h).toContain('2 sesi · 5 SKS');
    expect(html(<JadwalMingguan jadwal={[]} />)).toContain('Belum ada jadwal');
    const k = html(<KuliahHariIni jadwal={jadwal} kini={new Date(2026, 10, 23, 8, 0)} />);
    expect(k).toContain('Berlangsung');
    expect(html(<KuliahHariIni jadwal={jadwal} kini={new Date(2026, 10, 24, 8, 0)} />)).toContain('Tidak ada kuliah hari Selasa');
  });
  it('TahapanAkademik & portal', () => {
    const kini = new Date(2026, 10, 22, 10);
    const tahapan = [
      { judul: 'KRS online', mulai: '2026-11-17', selesai: '2026-11-24', jenis: 'krs' },
      { judul: 'Perkuliahan', mulai: '2026-11-25', selesai: '2027-01-10', jenis: 'perkuliahan' },
    ];
    const t = html(<TahapanAkademik tahapan={tahapan} kini={kini} />);
    expect(t).toContain('Sisa 3 hari');
    expect(t).toContain('u-ak-tahapan-kini');
    const p = html(
      <PortalAkademikMahasiswa
        kini={kini}
        transkrip={{ ipk: { nilai: 3.62 }, jumlah_sks: 98 }}
        krs={{ tahun_id: '20261', mata_kuliah: [{ sks: 3, disetujui: true }] }}
        jadwal={[]}
        sksLulus={144}
        tahapan={tahapan}
        predikat={[{ predikat: 'Dengan pujian', bobot_min: 3.51, bobot_max: 4 }]}
      />,
    );
    expect(p).toContain('3.62');
    expect(p).toContain('Dengan pujian');
    expect(p).toContain('98 / 144');
    expect(p).toContain('46 SKS lagi');
    expect(p).toContain('KRS online');
    const d = html(<PortalMengajarDosen kini={kini} jadwal={[{ idj: 1, sks: 3, hari: '1' }, { idj: 1, sks: 3, hari: '3' }, { idj: 2, sks: 2, hari: '2' }]} jumlahBimbingan={18} krsMenunggu={4} />);
    expect(d).toContain('5 SKS mengajar');
    expect(d).toContain('Perlu persetujuan Anda');
  });
  it('UnggahBerkasAkademik: status, catatan pemeriksa, kemajuan wajib, hanya baca', () => {
    const syarat = [
      { kunci: '1', nama: 'Sertifikat TOEFL', wajib: true, status: 'terpenuhi' as const, lampiran: [{ id: 'u1', nama: 'toefl.pdf', ukuran: 204800 }] },
      { kunci: '2', nama: 'Bukti publikasi', wajib: true, status: 'ditolak' as const, catatan: 'Berkas buram, unggah ulang.', ekstensi: ['pdf'] },
      { kunci: '3', nama: 'Foto wisuda', wajib: false },
    ];
    const h = html(<UnggahBerkasAkademik syarat={syarat} onUnggah={async () => undefined} onHapus={async () => undefined} />);
    expect(h).toContain('1 dari 2 berkas wajib diterima');
    expect(h).toContain('Perlu diperbaiki');
    expect(h).toContain('Berkas buram, unggah ulang.');
    expect(h).toContain('Unggah berkas perbaikan');
    expect(h).toContain('(opsional)');
    expect(h).toContain('PDF');
    // Syarat diterima: tidak ada tombol hapus lampiran.
    expect(h).not.toContain('aria-label="Hapus toefl.pdf"');
    const ro = html(<UnggahBerkasAkademik syarat={syarat} hanyaBaca />);
    expect(ro).not.toContain('Unggah berkas perbaikan');
  });
});
