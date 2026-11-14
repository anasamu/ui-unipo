import { CodeBlock, InlineCode } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Blok kode',
  category: 'Tampilan data',
  layout: 'wide',
  description: 'Blok kode bertab untuk dokumentasi API dan halaman pengembang: nomor baris, pewarnaan sintaks ringan tanpa dependensi, sorot baris, dan tombol salin.',
  importLine: "import { CodeBlock, InlineCode } from '@unipo/ui';",
  demos: { Tab: 'Contoh permintaan API', Tunggal: 'Satu berkas dengan sorotan', Sebaris: 'Kode sebaris' },
  props: [
    ['tabs', 'Array<{ label, language, code, filename? }>', 'Beberapa bahasa dalam satu blok.'],
    ['code, language, filename', 'string', 'Satu potongan kode.'],
    ['highlightLines', 'number[]', 'Baris yang disorot.'],
    ['theme', "'dark' | 'auto'", 'dark selalu gelap; auto ikut tema halaman.'],
    ['lineNumbers, windowControls, wrap, maxHeight', '…', 'Tampilan.'],
  ],
};

export function Tab() {
  return (
    <CodeBlock
      defaultTab={3}
      tabs={[
        { label: 'cURL', language: 'bash', code: `curl -X POST https://api.unipo.ac.id/v1/auth/token \\\n  -d grant_type=client_credentials \\\n  -d client_id=$CLIENT_ID \\\n  -d client_secret=$CLIENT_SECRET \\\n  -d "scope=referensi:read jadwal:read"` },
        { label: 'JavaScript', language: 'ts', code: `import { Siakad } from 'unipo-siakad-sdk';\n\nconst siakad = new Siakad({\n  clientId: process.env.SIAKAD_CLIENT_ID,\n  clientSecret: process.env.SIAKAD_CLIENT_SECRET,\n  scope: ['referensi:read', 'jadwal:read'],\n});\n\nconst { data } = await siakad.referensi.getProdi();` },
        { label: 'Python', language: 'python', code: `import requests\n\nr = requests.post("https://api.unipo.ac.id/v1/auth/token", data={\n    "grant_type": "client_credentials",\n    "client_id": CLIENT_ID,\n    "client_secret": CLIENT_SECRET,\n    "scope": "referensi:read jadwal:read",\n})\ntoken = r.json()["access_token"]` },
        { label: 'JSON', language: 'json', code: `{\n  "access_token": "eyJhbGciOiJIUzI1NiIs...",\n  "token_type": "Bearer",\n  "expires_in": 3600,\n  "scope": "referensi:read jadwal:read"\n}` },
      ]}
    />
  );
}

export function Tunggal() {
  return (
    <CodeBlock
      language="php"
      filename="routes/web.php"
      highlightLines={[4, 5]}
      code={`<?php\nuse Unipo\\Siakad\\Laravel\\Facades\\Siakad;\n\nRoute::get('/prodi', function () {\n    return Siakad::referensi()->getProdi()->data;\n});`}
    />
  );
}

export function Sebaris() {
  return (
    <p style={{ margin: 0 }}>
      Pasang SDK dengan <InlineCode copyable>npm install unipo-siakad-sdk</InlineCode> lalu set <InlineCode>SIAKAD_CLIENT_ID</InlineCode> di berkas <InlineCode>.env</InlineCode>.
    </p>
  );
}
