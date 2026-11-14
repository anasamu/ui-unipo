import { Alert, Badge, CodeBlock } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Pengantar',
  category: 'Mulai',
  order: 1,
  prose: true,
  description: 'UNIPO UI adalah sistem desain dan pustaka komponen untuk semua aplikasi Universitas Pohuwato: SIAKAD, PMB, LMS, portal fakultas, tracer study, humas, dan aplikasi pihak ketiga yang memakai API SIAKAD.',
  demos: { Lapisan: 'Tiga lapis', Platform: 'Dukungan platform', Prinsip: 'Prinsip desain' },
};

export function Lapisan() {
  return (
    <>
      <p>Pustaka ini disusun berlapis supaya bagian yang sama bisa dipakai di banyak teknologi:</p>
      <ol>
        <li><strong>Token</strong> (<code className="u-inline-code">@unipo/tokens</code>): warna, jarak, sudut, huruf, durasi. Satu sumber JSON dibangun menjadi CSS, SCSS, LESS, preset Tailwind, TypeScript untuk React Native, dan tema Kotlin Jetpack Compose.</li>
        <li><strong>CSS komponen</strong> (<code className="u-inline-code">@unipo/ui/css</code>): kelas <code className="u-inline-code">u-*</code> tanpa JavaScript, bisa dipakai di Vue, Svelte, Blade, atau HTML biasa.</li>
        <li><strong>Komponen React</strong> (<code className="u-inline-code">@unipo/ui</code>): primitif aksesibel di atas Base UI, lalu komponen terhubung SDK (<code className="u-inline-code">@unipo/ui/siakad</code>) dan widget per fitur (<code className="u-inline-code">@unipo/ui/widgets</code>).</li>
      </ol>
    </>
  );
}

export function Platform() {
  return (
    <>
      <div className="u-table-wrap">
        <table className="u-table">
          <thead>
            <tr><th>Platform</th><th>Yang tersedia sekarang</th><th>Status</th></tr>
          </thead>
          <tbody>
            <tr><td>React 18/19, Vite</td><td>Semua komponen</td><td><Badge variant="success" dot>Diuji</Badge></td></tr>
            <tr><td>Next.js (App Router)</td><td>Semua komponen; berkas sudah bertanda <code className="u-inline-code">'use client'</code></td><td><Badge variant="primary" dot>Didukung</Badge></td></tr>
            <tr><td>Vue, Nuxt, Svelte, Blade, HTML</td><td>Token + CSS kelas <code className="u-inline-code">u-*</code></td><td><Badge variant="primary" dot>Didukung (tanpa interaksi)</Badge></td></tr>
            <tr><td>React Native / Expo</td><td>Token warna, jarak, huruf (<code className="u-inline-code">colors(mode)</code>)</td><td><Badge variant="warning" dot>Token saja</Badge></td></tr>
            <tr><td>Android (Kotlin, Compose)</td><td><code className="u-inline-code">UnipoTheme.kt</code> + <code className="u-inline-code">colors.xml</code></td><td><Badge variant="warning" dot>Token saja</Badge></td></tr>
          </tbody>
        </table>
      </div>
      <Alert variant="info" title="Jujur soal cakupan">
        Komponen interaktif (dialog, combobox, tabel data, wizard) saat ini ditulis untuk React. Di Vue/React Native/Kotlin, tampilan dan tema sudah sama lewat token, tetapi komponennya perlu dibuat dengan kerangka masing-masing.
      </Alert>
    </>
  );
}

export function Prinsip() {
  return (
    <>
      <ul>
        <li><strong>Data nyata dulu.</strong> Komponen dirancang untuk isi SIAKAD sebenarnya: NIM panjang, nama bergelar, 40 prodi, tabel ribuan baris.</li>
        <li><strong>Tenang dan rapi.</strong> Kedalaman dari garis tepi dan bayangan lembut, tanpa gradasi pelangi atau efek kaca.</li>
        <li><strong>Bisa diakses.</strong> Semua kontrol bisa dipakai dengan papan ketik, punya label, dan cincin fokus yang terlihat.</li>
        <li><strong>Satu variabel, satu tema.</strong> Ganti <code className="u-inline-code">--u-primary</code> dan seluruh komponen ikut.</li>
      </ul>
      <CodeBlock
        language="css"
        filename="tema-fakultas.css"
        code={`:root {\n  --u-primary: #0f766e;   /* hijau toska fakultas */\n  --u-secondary: #f59e0b;\n  --u-radius: 0.5rem;\n}`}
      />
    </>
  );
}
