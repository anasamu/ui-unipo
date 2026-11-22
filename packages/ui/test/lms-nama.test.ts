import { describe, expect, it } from 'vitest';
import { namaKelasRapiLms } from '../src/siakad/lms';
import { labelPeriodeLms, namaHariLms, teksJadwalLms, teksRuangLms } from '../src/siakad/lms-belajar';

describe('label kelas LMS (LMS-22/24)', () => {
  it('nama kelas kapital menjadi huruf judul tanpa akhiran kelas', () => {
    expect(namaKelasRapiLms('HUKUM ACARA KONSTITUSI - Kelas 05')).toBe('Hukum Acara Konstitusi');
    expect(namaKelasRapiLms('HUKUM PERKAWINAN DAN MAWARIS - Kelas 05')).toBe('Hukum Perkawinan dan Mawaris');
    expect(namaKelasRapiLms('INFORMATION AND COMMUNICATION TECHNOLOGY (ICT)')).toBe('Information and Communication Technology (ICT)');
    expect(namaKelasRapiLms('BAHASA INGGRIS II')).toBe('Bahasa Inggris II');
    expect(namaKelasRapiLms('Basis Data - Kelas A')).toBe('Basis Data');
  });
  it('jadwal: nama hari, jam, dan ruang terbaca awam', () => {
    expect(namaHariLms('5')).toBe('Jumat');
    expect(namaHariLms('Senin')).toBe('Senin');
    expect(teksJadwalLms({ hari: '6', jamke: 13, jam_mulai: '15:45:00', jam_selesai: '17:15:00' })).toBe('Sabtu, 15.45–17.15');
    expect(teksJadwalLms({ hari: '2', jamke: 3 })).toBe('Selasa, jam ke-3');
    expect(teksRuangLms({ ruang: '012', nama_ruang: 'Lab Hukum' })).toBe('Lab Hukum');
    expect(teksRuangLms({ ruang: '012' })).toBe('Ruang 012');
    expect(labelPeriodeLms('20261')).toBe('Ganjil 2026/2027');
  });
});
