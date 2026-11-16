import * as React from 'react';
import { Avatar, Button, Card, CardContent } from 'unipo-ui';
import { ChatMengambang, DaftarPengguna, KotakObrolan, PengaturanObrolan, TombolObrolan, type OrangObrolan } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Obrolan terenkripsi',
  category: 'Terhubung SDK',
  layout: 'wide',
  order: 9,
  badge: 'baru',
  description:
    'Chat realtime untuk semua peran (mahasiswa, dosen, tendik, maba, pendaftar PMB) dengan enkripsi end-to-end. Pesan, lampiran, balasan, dan reaksi dikunci di browser sebelum dikirim; server SIAKAD hanya menyimpan data terenkripsi. Ada chat mengambang dengan lencana belum dibaca, kotak obrolan dua kolom, daftar pengguna dengan saringan peran, grup, tanda dibaca, sedang mengetik, pesan menghilang, nomor keamanan, cadangan kunci, dan blokir.',
  importLine: "import { ChatMengambang, KotakObrolan, DaftarObrolan, DaftarPengguna, RuangObrolan, PengaturanObrolan, NomorKeamanan, TombolObrolan, bukaObrolan, useObrolan } from 'unipo-ui/siakad';",
  demos: {
    Mengambang: 'ChatMengambang: tombol di pojok + panel (layar penuh di ponsel). Coba kirim pesan ke Dr. Hendra atau grup kelas: kontak tiruan membuka pesan dengan kunci privatnya lalu membalas.',
    Kotak: 'KotakObrolan: dua kolom di layar lebar, satu kolom di layar sempit',
    Pengguna: 'DaftarPengguna + TombolObrolan: cari orang lalu buka obrolan langsung',
    Pengaturan: 'PengaturanObrolan: perangkat, cadangan kunci, privasi, blokir',
  },
  props: [
    ['ChatMengambang', '{ posisi?: "kanan" | "kiri", bawah?: number, judul? }', 'Pasang sekali di layout aplikasi. bawah = jarak dari tepi bawah (px) bila ada navigasi bawah.'],
    ['KotakObrolan', '{ tinggi?, ruang?, onRuangChange?, judul? }', 'Halaman obrolan penuh. ruang + onRuangChange untuk menyimpan ruang aktif di URL.'],
    [
      'DaftarPengguna',
      '{ onPilih?, pilihBanyak?, terpilih?, onTerpilihChange?, saringan?, kecuali? }',
      'Cari nama atau NIM/NIDN; tanpa kata kunci menampilkan kontak terakhir. Hanya nama dan peran yang dikirim server.',
    ],
    ['RuangObrolan', '{ id, onKembali?, onTutup? }', 'Satu ruang obrolan, untuk tata letak sendiri.'],
    ['DaftarObrolan', '{ aktif?, onPilih }', 'Daftar ruang dengan cuplikan pesan terakhir (didekripsi di browser).'],
    ['TombolObrolan', '{ pemilik }', 'Tombol "Kirim pesan" untuk kartu profil, daftar dosen wali, dsb. bukaObrolan(pemilik) untuk memanggil dari kode.'],
    ['NomorKeamanan', '{ pemilik, nama }', '60 angka yang dicocokkan di kedua layar.'],
    ['useObrolan()', '{ mesin, keadaan }', 'Untuk komponen kustom: keadaan.ruang, keadaan.pesan, mesin.kirimTeks(), mesin.pesanTampil(), dll.'],
    ['kriptoObrolan', 'namespace', 'Pustaka kripto (WebCrypto) yang sama untuk aplikasi atau bot lain.'],
  ],
  notes: [
    'Protokol: tiap browser membuat kunci ECDH P-256 dan ECDSA P-256 di IndexedDB. Tiap pesan memakai kunci AES-256-GCM acak yang dibungkus (ECDH efemeral + HKDF-SHA256 + AES-KW) untuk setiap perangkat aktif anggota, lalu ditandatangani perangkat pengirim. Server menolak pesan yang tidak dibungkus untuk tepat semua perangkat aktif, jadi perangkat tidak bisa diam-diam disisipkan.',
    'Server tetap melihat metadata: siapa mengobrol dengan siapa, waktu, ukuran pesan, dan judul grup. Ini bukan double ratchet Signal: bila kunci privat sebuah perangkat dicuri, pesan lama untuk perangkat itu bisa dibuka. Cabut perangkat yang hilang di Pengaturan.',
    'Kunci hanya ada di browser. Agar pesan lama terbaca di browser lain, buat cadangan kunci dengan sandi (PBKDF2 600.000 iterasi + AES-GCM); sandi tidak dikirim ke server.',
    'Realtime memakai long-poll GET /v1/obrolan/peristiwa (hosting cPanel tidak mendukung WebSocket). Semua komponen di halaman berbagi satu koneksi.',
    'Pendaftar PMB hanya bisa menghubungi panitia PMB, admin, dan operator (OBROLAN_LEVEL_UNTUK_PENDAFTAR). Pesan tetap bisa dikirim ke orang yang belum pernah membuka obrolan (belum punya kunci). Begitu ia membukanya, perangkat pengirim membungkus ulang kunci pesan untuk perangkat barunya secara otomatis (GET/POST /v1/obrolan/susulan), jadi pesan terbuka tanpa server pernah memegang kuncinya. Perangkat tambahan milik orang yang sudah punya kunci tetap memakai cadangan kunci.',
    'Di halaman ini server dan kontaknya tiruan, tetapi enkripsinya sungguhan: kontak tiruan memegang kunci perangkat sendiri dan membuka pesan Anda seperti aplikasi penerima. Riwayat contoh hilang saat halaman dimuat ulang.',
  ],
};

export function Mengambang() {
  return (
    <div className="demo-ob-bingkai">
      <div className="demo-ob-halaman" aria-hidden>
        <div className="demo-ob-garis" style={{ width: '40%' }} />
        <div className="demo-ob-garis" style={{ width: '70%' }} />
        <div className="demo-ob-kartu" />
        <div className="demo-ob-kartu" />
      </div>
      <ChatMengambang />
    </div>
  );
}

export function Kotak() {
  return <KotakObrolan tinggi={620} />;
}

export function Pengguna() {
  const [dipilih, setDipilih] = React.useState<OrangObrolan | null>(null);
  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', alignItems: 'start' }}>
      <Card>
        <CardContent style={{ height: 420, display: 'flex', flexDirection: 'column' }}>
          <DaftarPengguna onPilih={setDipilih} />
        </CardContent>
      </Card>
      <Card>
        <CardContent style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, textAlign: 'center', padding: 24 }}>
          {dipilih ? (
            <>
              <Avatar name={dipilih.nama} size="xl" status={dipilih.daring ? 'online' : undefined} />
              <div>
                <strong>{dipilih.nama}</strong>
                <div style={{ color: 'var(--u-muted-foreground)', fontSize: 'var(--u-text-sm)' }}>{dipilih.peran}</div>
              </div>
              <TombolObrolan pemilik={dipilih.id} />
              {!dipilih.punya_kunci && <small style={{ color: 'var(--u-muted-foreground)' }}>Belum pernah membuka obrolan. Pesan tetap terkirim dan terbuka saat ia membukanya.</small>}
            </>
          ) : (
            <span style={{ color: 'var(--u-muted-foreground)' }}>Pilih seseorang di daftar. TombolObrolan membuka obrolan di chat mengambang atau kotak obrolan yang terpasang.</span>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function Pengaturan() {
  const [buka, setBuka] = React.useState(false);
  return (
    <>
      <Button variant="outline" onClick={() => setBuka(true)}>
        Buka pengaturan obrolan
      </Button>
      <PengaturanObrolan open={buka} onOpenChange={setBuka} />
    </>
  );
}
