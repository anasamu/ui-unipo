import { Field, SegmentedControl } from 'unipo-ui';
import { PengaturanTema } from 'unipo-ui/siakad';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pengaturan tema aplikasi',
  category: 'Fondasi',
  order: 3,
  badge: 'baru',
  layout: 'wide',
  description:
    'Tema dinamis untuk semua aplikasi kampus: disimpan di SIAKAD (/v1/tema), diubah dari aplikasinya sendiri oleh pengguna yang berhak (izin <aplikasi>.tema), dan berlaku tanpa deploy ulang. Lapis kampus → aplikasi → lingkup (mis. fakultas 05).',
  importLine: "import { TemaAplikasi, PengaturanTema } from 'unipo-ui/siakad';",
  demos: { Atur: 'PengaturanTema: preset, warna, huruf, sudut, mode bawaan, tata letak khusus aplikasi, riwayat', Pasang: 'TemaAplikasi: pasang tema di akar aplikasi' },
  props: [
    ['aplikasi', 'string', 'Kode aplikasi di katalog RBAC (pmb, lms, tracer, humas, fakultas, ...) atau kampus.'],
    ['lingkup', 'string', 'Pemasangan aplikasi, mis. kode fakultas.'],
    ['tataTambahan', '(tata, ubah) => ReactNode', 'Kolom tata letak khusus aplikasi (PengaturanTema).'],
    ['kunciCache', 'string', 'Kunci localStorage CSS tema; pasangkan dengan skripAwalTema() di index.html agar tidak berkedip.'],
    ['cadangan', 'Partial<OpsiTema>', 'Tema bila belum ada tema tersimpan (TemaAplikasi).'],
  ],
  notes: [
    'Simpan, riwayat, dan pulihkan butuh token pengguna ber-scope tema:read dan tema:write; pengguna tanpa izin hanya melihat.',
    'Tanpa React: baca GET /v1/tema/{aplikasi} lalu pasangTemaAplikasi(tema) atau buatTema(tema) dari unipo-ui/tema.',
  ],
};

type TataPortal = { mode?: 'pengguna' | 'terang' | 'gelap'; hero?: 'gambar' | 'gradien' | 'terpisah' };

export function Atur() {
  return (
    <PengaturanTema<TataPortal>
      aplikasi="fakultas"
      lingkup="05"
      nama="Fakultas Teknik"
      kunciCache="docs.tema.css"
      tataTambahan={(tata, ubah) => (
        <Field label="Gaya hero landing page">
          <SegmentedControl
            fullWidth
            value={tata.hero ?? 'gambar'}
            onValueChange={(v) => ubah({ hero: v as TataPortal['hero'] })}
            options={[{ value: 'gambar', label: 'Foto' }, { value: 'gradien', label: 'Gradien' }, { value: 'terpisah', label: 'Terpisah' }]}
          />
        </Field>
      )}
    />
  );
}

export function Pasang() {
  return (
    <pre className="u-mono" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{`// index.html, sebelum skrip aplikasi (mencegah kedip)
<script>{skripAwalTema('pmb.tema.css')}</script>  // dari unipo-ui/tema, isi saat build

// akar aplikasi
<UnipoProvider siakad={siakad}>
  <TemaAplikasi aplikasi="pmb" />
  <App />
</UnipoProvider>`}</pre>
  );
}
