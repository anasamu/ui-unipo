import * as React from 'react';
import { Button } from 'unipo-ui';
import { DaftarAplikasi, DetailAplikasi, FormAplikasi, KartuAplikasi, PilihScope, SecretSekali, WizardAplikasi, useAplikasiTerpadu, type AplikasiTerpadu } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';
import { jsxProps } from '../Playground';

export const meta: DemoMeta = {
  title: 'Aplikasi integrasi',
  category: 'Pustikom & SSO',
  layout: 'wide',
  order: 1,
  description:
    'Kelola aplikasi yang memakai login SSO dan API SIAKAD dari satu tempat. Satu aplikasi adalah gabungan katalog hak akses (/v1/rbac/aplikasi), klien SSO (API admin SSO lewat BFF), dan klien API (/v1/rbac/klien-api).',
  importLine: "import { SsoAdminProvider, createSsoAdmin, DaftarAplikasi, DetailAplikasi, WizardAplikasi } from 'unipo-ui/siakad';",
  demos: {
    Daftar: 'DaftarAplikasi: angka ringkas, cari, saring, kartu atau tabel, panel detail, wizard',
    Detail: 'DetailAplikasi: ringkasan, login SSO, klien API, log API, aktivitas login',
    Wizard: "WizardAplikasi: modal atau tampilan='halaman', secret ditampilkan sekali",
    Ubah: 'FormAplikasi: ubah katalog, login SSO, dan klien API sekaligus',
    Kartu: 'KartuAplikasi',
    Scope: 'PilihScope: centang Baca/Tulis per sumber data',
    Secret: 'SecretSekali: salin secret dan isi .env',
  },
  props: [
    [
      'SsoAdminProvider.client',
      'createSsoAdmin({ baseUrl, headers, methodOverride })',
      "Klien API admin SSO lewat BFF (bawaan '/bff/sso'). Secret admin SSO tetap di server; browser hanya membawa cookie sesi + CSRF.",
    ],
    ['DaftarAplikasi.onPilih / href', '(a) => void | string', 'Bawaan: buka SheetDetailAplikasi. Isi href untuk halaman detail sendiri.'],
    ['DaftarAplikasi.tampilan', "'kartu' | 'tabel'", 'Tampilan awal; bisa diganti pengguna.'],
    ['DetailAplikasi.kode / aplikasi', 'string | AplikasiTerpadu', 'Ambil dari API berdasarkan kode, atau berikan data yang sudah ada.'],
    ['WizardAplikasi.tampilan', "'dialog' | 'halaman'", 'Modal (bawaan) atau dipasang langsung di halaman.'],
    ['WizardAplikasi.buat', '(input) => Promise<HasilAplikasiBaru>', 'Ganti cara membuat (bawaan buatAplikasiLengkap: katalog → izin → SSO → API → tautan).'],
    ['PilihScope.katalog', 'Record<scope, keterangan>', 'Bawaan diambil dari /v1/rbac/klien-api/scope.'],
    ['useAplikasiTerpadu()', '{ data, loading, peringatan }', 'Data gabungan untuk tampilan sendiri; bila SSO belum terpasang, daftar tetap tampil dari SIAKAD.'],
  ],
  notes: [
    'Di Pustikom: createSsoAdmin({ baseUrl: "/bff/sso", headers: () => ({ "X-CSRF-Token": csrf }), methodOverride: true }). methodOverride mengirim PATCH/DELETE sebagai POST untuk hosting yang menolak metode itu.',
    'Endpoint yang dipakai: GET/POST /v1/rbac/aplikasi, /v1/rbac/klien-api (+ /scope, /{id}/secret), /v1/rbac/peran, dan di SSO /clients, /clients/{id}(/secret|/logo).',
  ],
  playground: {
    title: 'Playground DaftarAplikasi',
    controls: [
      { name: 'tampilan', type: 'select', options: ['kartu', 'tabel'], default: 'kartu' },
      { name: 'statistik', label: 'Kartu angka', type: 'boolean', default: false },
      { name: 'bolehBuat', label: 'Tombol aplikasi baru', type: 'boolean', default: true },
    ],
    render: (p) => <DaftarAplikasi key={p.tampilan} {...p} />,
    code: (p) =>
      `<SsoAdminProvider client={createSsoAdmin({ baseUrl: '/bff/sso' })}>\n  <DaftarAplikasi${jsxProps(p, { tampilan: 'kartu', statistik: true, bolehBuat: true })} />\n</SsoAdminProvider>`,
  },
};

export function Daftar() {
  return <DaftarAplikasi />;
}

export function Detail() {
  return <DetailAplikasi kode="elearning" />;
}

export function Wizard() {
  const [buka, setBuka] = React.useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <Button onClick={() => setBuka(true)}>Buka sebagai modal</Button>
      </div>
      <WizardAplikasi open={buka} onOpenChange={setBuka} />
      <WizardAplikasi tampilan="halaman" open onOpenChange={() => undefined} />
    </div>
  );
}

function useSatu(kode: string): AplikasiTerpadu | undefined {
  return useAplikasiTerpadu().data?.find((a) => a.kode === kode);
}

export function Ubah() {
  const a = useSatu('pmb');
  return <div style={{ maxWidth: 640 }}>{a ? <FormAplikasi aplikasi={a} onBatal={() => undefined} /> : null}</div>;
}

export function Kartu() {
  const a = useSatu('elearning');
  const b = useSatu('perpus-mobile');
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(17rem, 1fr))', gap: 16 }}>
      {a && <KartuAplikasi aplikasi={a} onPilih={() => undefined} />}
      {b && (
        <KartuAplikasi
          aplikasi={b}
          aksi={
            <Button size="sm" variant="outline">
              Kelola
            </Button>
          }
        />
      )}
    </div>
  );
}

export function Scope() {
  const [v, setV] = React.useState(['mahasiswa:read', 'krs:read', 'lms:read', 'lms:write']);
  return (
    <div style={{ maxWidth: 560 }}>
      <PilihScope value={v} onValueChange={setV} />
    </div>
  );
}

export function Secret() {
  const [buka, setBuka] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setBuka(true)}>
        Tampilkan contoh secret
      </Button>
      <SecretSekali
        open={buka}
        onOpenChange={setBuka}
        judul="Kredensial E-Learning"
        isi={[
          { label: 'Client ID SSO', nilai: 'elearning' },
          { label: 'Client secret SSO', nilai: 'contoh-4f8Qk2xVbN7mPz3LwR9tYc6HdJ1sA5eG', rahasia: true },
        ]}
        env={'SSO_ISSUER=https://sso.unipo.ac.id\nSSO_CLIENT_ID=elearning\nSSO_CLIENT_SECRET=contoh-4f8Qk2xVbN7mPz3LwR9tYc6HdJ1sA5eG'}
      />
    </>
  );
}
