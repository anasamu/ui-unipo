import { KeamananPengguna, LogAktivitas, LogApi, RingkasanLogApi } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Log & keamanan',
  category: 'Pustikom & SSO',
  layout: 'wide',
  order: 2,
  description:
    'Log permintaan API SIAKAD (dibaca dari storage/logs/api-*.log lewat /v1/rbac/log-api), dasbor ringkasannya, log aktivitas SSO (masuk, gagal masuk, keluar, perubahan admin), dan keamanan akun satu pengguna.',
  importLine: "import { LogApi, RingkasanLogApi, LogAktivitas, KeamananPengguna } from 'unipo-ui/siakad';",
  demos: {
    Ringkasan: 'RingkasanLogApi: permintaan, galat, p95, grafik, endpoint dan aplikasi teratas',
    Permintaan: 'LogApi: tabel permintaan dengan saringan dan rincian',
    Aktivitas: 'LogAktivitas: linimasa aktivitas SSO dengan chip per peristiwa',
    Keamanan: 'KeamananPengguna: sesi aktif, riwayat login, keluarkan dari semua perangkat',
  },
  props: [
    ['LogApi.clientId / username', 'string', 'Batasi ke satu aplikasi atau pengguna (dipakai di tab detail aplikasi).'],
    ['LogApi.hari', 'number', 'Rentang awal (bawaan 1 = hari ini, maks 31).'],
    ['RingkasanLogApi.hari', '1 | 7 | 30', 'Satu hari = grafik per jam; lebih = per hari.'],
    ['RingkasanLogApi.ringkas', 'boolean', 'Hanya kartu angka + grafik.'],
    ['LogAktivitas.username / clientId / grup', 'string', 'grup: login, logout, authorize, access, password, session, token, device, admin.'],
    ['LogAktivitas.onPilihPengguna', '(username) => void', 'Klik nama pengguna, mis. buka KeamananPengguna di panel.'],
    ['KeamananPengguna.username', 'string', 'Wajib. Tombol keluarkan memanggil POST /users/{u}/revoke.'],
  ],
  notes: [
    'Log API tidak menyimpan token, password, maupun isi permintaan. Hanya admin dengan token pengguna yang bisa membacanya.',
    'Log aktivitas dan keamanan akun memakai API admin SSO (/api/admin/audit, /api/admin/users/{u}/security) lewat BFF, sama seperti komponen aplikasi.',
  ],
};

export function Ringkasan() {
  return <RingkasanLogApi />;
}

export function Permintaan() {
  return <LogApi perPage={25} />;
}

export function Aktivitas() {
  return <LogAktivitas perPage={10} />;
}

export function Keamanan() {
  return <KeamananPengguna username="2355201010" />;
}
