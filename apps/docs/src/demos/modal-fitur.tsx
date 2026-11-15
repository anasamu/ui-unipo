import * as React from 'react';
import { Button, ModalAksesDitolak, ModalBerhasil, ModalFitur, ModalSalahPassword, ModalSesiHabis, RincianModal, useToast } from 'unipo-ui';
import { laporSesiHabis, ModalAjukanLayanan, ModalAmbilKrs, ModalCekKelulusan, ModalDaftarWisuda, PenjagaSesiSiakad } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Modal per fitur',
  category: 'Overlay',
  layout: 'normal',
  order: 61,
  badge: 'baru',
  description:
    'Modal berilustrasi untuk tiap fitur dan keadaan API SIAKAD. ModalFitur adalah dasarnya: ilustrasi tokoh sesuai fitur, judul, isi, dan tombol aksi async yang menampilkan kotak galat beserta kode laporan (request_id) bila gagal. Di atasnya ada preset keadaan (sesi habis, salah password, akses ditolak, berhasil) dan modal yang sudah tersambung ke SDK: ajukan layanan, cek kelulusan, daftar wisuda, dan ambil KRS. NIM diambil dari akun yang masuk, tidak diketik.',
  importLine:
    "import { ModalFitur, ModalSesiHabis, ModalSalahPassword, ModalAksesDitolak, ModalBerhasil } from 'unipo-ui';\nimport { ModalAjukanLayanan, ModalCekKelulusan, ModalDaftarWisuda, ModalAmbilKrs, PenjagaSesiSiakad } from 'unipo-ui/siakad';",
  demos: {
    Keadaan: 'Preset keadaan: sesi habis, salah password, akses ditolak, berhasil',
    Dasar: 'ModalFitur sendiri: ilustrasi + aksi async + kotak galat',
    Layanan: 'ModalAjukanLayanan: katalog /v1/layanan/jenis → isian → POST /v1/layanan/permohonan',
    Kelulusan: 'ModalCekKelulusan + ModalDaftarWisuda: syarat yudisium/wisuda dari /v1/kelulusan',
    Krs: 'ModalAmbilKrs: penawaran, batas SKS, bentrok, simpan KRS',
    Sesi: 'PenjagaSesiSiakad: 401 dari API → modal sesi habis di seluruh aplikasi',
  },
  props: [
    ['ModalFitur.ilustrasi', 'NamaIlustrasi | IlustrasiProps', 'Adegan Ilustrasi (wisuda, krs, salah-password, …) atau props lengkap (ekspresi, aksesori).'],
    [
      'ModalFitur.aksi / aksiKedua',
      '{ label, onClick, variant?, icon?, tetapBuka? }',
      'onClick boleh async. Lempar galat SDK → kotak galat + kode laporan. Kembalikan teks → pesan tanpa menutup modal.',
    ],
    ['ModalFitur.wajib', 'boolean', 'Tidak bisa ditutup dengan Esc/klik luar (dipakai ModalSesiHabis).'],
    ['ModalSalahPassword', '{ sisaPercobaan?, terkunciSampai?, onCobaLagi?, onLupaPassword? }', 'Terkunci sampai waktu tertentu → ilustrasi dan teks berganti.'],
    ['ModalAksesDitolak.scope', 'string[]', 'Isi dari PermissionError.requiredScopes.'],
    ['ModalAjukanLayanan', '{ kategori?, kodeJenis?, onTerkirim? }', 'Batasi katalog, atau langsung buka satu jenis (mis. kodeJenis="SKAK"). Galat per field dari server ditampilkan di field-nya.'],
    ['ModalCekKelulusan', '{ nim?, tahunId?, onDaftarWisuda? }', 'Bawaan NIM akun yang masuk. Tombol daftar wisuda muncul bila syarat wisuda terpenuhi.'],
    ['ModalAmbilKrs / ModalDaftarWisuda', 'Dasar + onTersimpan / onTerdaftar', 'Membungkus AmbilKrs dan PendaftaranWisuda.'],
    ['PenjagaSesiSiakad', '{ onMasuk?, onSimpanDraf? }', 'Pasang sekali di akar. laporSesiHabis() untuk aksi tulis yang menangkap 401 sendiri; pulihkanSesi() setelah token baru.'],
  ],
  notes: [
    'Scope token: layanan:read + layanan:write (ajukan layanan), kelulusan:read (+ kelulusan:write untuk daftar wisuda), krs:read + krs:write (ambil KRS), profil:read (NIM dari akun).',
    'Semua pemeriksaan tetap di server (level yang boleh, isian wajib, masa pendaftaran). Modal hanya menampilkan hasilnya.',
  ],
};

export function Keadaan() {
  const [buka, setBuka] = React.useState<string | null>(null);
  const toast = useToast();
  const set = (k: string) => (o: boolean) => setBuka(o ? k : null);
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <Button variant="outline" onClick={() => setBuka('sesi')}>
        Sesi habis
      </Button>
      <Button variant="outline" onClick={() => setBuka('salah')}>
        Salah password
      </Button>
      <Button variant="outline" onClick={() => setBuka('kunci')}>
        Akun terkunci
      </Button>
      <Button variant="outline" onClick={() => setBuka('tolak')}>
        Akses ditolak
      </Button>
      <Button variant="outline" onClick={() => setBuka('ok')}>
        Berhasil
      </Button>
      <ModalSesiHabis open={buka === 'sesi'} onOpenChange={set('sesi')} onMasuk={() => setBuka(null)} />
      <ModalSalahPassword
        open={buka === 'salah'}
        onOpenChange={set('salah')}
        sisaPercobaan={2}
        onCobaLagi={() => undefined}
        onLupaPassword={() => void toast.add({ title: 'Membuka lupa password (contoh).' })}
      />
      <ModalSalahPassword open={buka === 'kunci'} onOpenChange={set('kunci')} terkunciSampai={new Date(Date.now() + 15 * 60_000)} onLupaPassword={() => undefined} />
      <ModalAksesDitolak open={buka === 'tolak'} onOpenChange={set('tolak')} fitur="data keuangan mahasiswa" scope={['keuangan:read', 'mahasiswa:read']} onMintaAkses={() => undefined} />
      <ModalBerhasil
        open={buka === 'ok'}
        onOpenChange={set('ok')}
        ilustrasi="pembayaran"
        title="Pembayaran UKT diterima"
        description="Terima kasih. Status pembayaran sudah tercatat dan KRS bisa diisi."
        aksi={{ label: 'Isi KRS sekarang', onClick: () => undefined }}
      >
        <RincianModal
          baris={[
            ['Tagihan', 'UKT Ganjil 2026/2027'],
            ['Jumlah', 'Rp3.500.000'],
            ['Kanal', 'VA BSI 9881 2304 1100 01'],
          ]}
        />
      </ModalBerhasil>
    </div>
  );
}

export function Dasar() {
  return (
    <ModalFitur
      trigger={<Button>Kirim berkas skripsi</Button>}
      ilustrasi={{ nama: 'skripsi', ekspresi: 'senang' }}
      title="Kirim naskah ke pembimbing?"
      description="Naskah bab 4 akan dikirim ke dua pembimbing. Anda mendapat notifikasi saat mereka memberi catatan."
      aksi={{
        label: 'Kirim',
        onClick: async () => {
          await new Promise((r) => setTimeout(r, 700));
          throw Object.assign(new Error('Server SIAKAD sedang bermasalah. Coba lagi beberapa saat.'), { status: 500, requestId: 'req_4c1d82be90' });
        },
      }}
    />
  );
}

export function Layanan() {
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <ModalAjukanLayanan trigger={<Button>Ajukan layanan</Button>} />
      <ModalAjukanLayanan trigger={<Button variant="outline">Surat aktif kuliah</Button>} kodeJenis="SKAK" />
    </div>
  );
}

export function Kelulusan() {
  const [wisuda, setWisuda] = React.useState(false);
  return (
    <div style={{ display: 'flex', gap: '.5rem', flexWrap: 'wrap' }}>
      <ModalCekKelulusan trigger={<Button>Cek kesiapan lulus</Button>} onDaftarWisuda={() => setWisuda(true)} />
      <Button variant="outline" onClick={() => setWisuda(true)}>
        Daftar wisuda
      </Button>
      <ModalDaftarWisuda open={wisuda} onOpenChange={setWisuda} />
    </div>
  );
}

export function Krs() {
  return <ModalAmbilKrs trigger={<Button>Ambil KRS</Button>} />;
}

export function Sesi() {
  return (
    <PenjagaSesiSiakad onMasuk={() => undefined}>
      <Button variant="outline" onClick={() => laporSesiHabis(Object.assign(new Error('Token kedaluwarsa'), { status: 401 }))}>
        Tiru balasan 401 dari API
      </Button>
    </PenjagaSesiSiakad>
  );
}
