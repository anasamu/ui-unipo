import { CodeBlock } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Instalasi',
  category: 'Mulai',
  order: 2,
  prose: true,
  description: 'Pasang paket, impor CSS sekali, lalu bungkus aplikasi dengan UnipoProvider bila memakai komponen yang mengambil data dari API SIAKAD.',
  demos: { Pasang: 'Pasang paket', ReactNext: 'React dan Next.js', SDK: 'Hubungkan ke SDK UNIPO', Lainnya: 'Vue, Blade, dan HTML' },
};

export function Pasang() {
  return (
    <CodeBlock
      tabs={[
        { label: 'npm', language: 'bash', code: 'npm install @unipo/ui @unipo/tokens unipo-siakad-sdk' },
        { label: 'pnpm', language: 'bash', code: 'pnpm add @unipo/ui @unipo/tokens unipo-siakad-sdk' },
        { label: 'yarn', language: 'bash', code: 'yarn add @unipo/ui @unipo/tokens unipo-siakad-sdk' },
      ]}
      lineNumbers={false}
    />
  );
}

export function ReactNext() {
  return (
    <CodeBlock
      tabs={[
        {
          label: 'Vite',
          language: 'tsx',
          code: `// main.tsx\nimport '@unipo/ui/css';\nimport { Button, Field, Input } from '@unipo/ui';\n\nexport function Login() {\n  return (\n    <form>\n      <Field label="NIM" required>\n        <Input name="nim" inputMode="numeric" />\n      </Field>\n      <Button type="submit">Masuk</Button>\n    </form>\n  );\n}`,
        },
        {
          label: 'Next.js',
          language: 'tsx',
          code: `// app/layout.tsx\nimport '@unipo/ui/css';\n\nexport default function RootLayout({ children }: { children: React.ReactNode }) {\n  return (\n    <html lang="id">\n      <body className="u-root">{children}</body>\n    </html>\n  );\n}`,
        },
      ]}
    />
  );
}

export function SDK() {
  return (
    <>
      <p>
        Komponen di <code className="u-inline-code">@unipo/ui/siakad</code> (CariMahasiswa, TabelDosen, KalenderAkademik, ...) mengambil data
        sendiri lewat <code className="u-inline-code">unipo-siakad-sdk</code>. Di browser, pakai token pengguna dan arahkan
        <code className="u-inline-code">baseUrl</code> ke BFF aplikasi Anda; <strong>jangan</strong> menaruh <code className="u-inline-code">client_secret</code> di kode browser.
      </p>
      <CodeBlock
        language="tsx"
        filename="providers.tsx"
        code={`'use client';\nimport { Siakad } from 'unipo-siakad-sdk';\nimport { UnipoProvider } from '@unipo/ui/siakad';\n\nconst siakad = new Siakad({\n  baseUrl: '/bff/api',          // diteruskan BFF ke api.unipo.ac.id\n  accessToken: sesi.accessToken, // token pengguna dari SSO\n});\n\nexport function Providers({ children }: { children: React.ReactNode }) {\n  return <UnipoProvider siakad={siakad}>{children}</UnipoProvider>;\n}`}
      />
    </>
  );
}

export function Lainnya() {
  return (
    <CodeBlock
      tabs={[
        {
          label: 'Vue',
          language: 'vue',
          code: `<script setup>\nimport '@unipo/ui/css';\n</script>\n\n<template>\n  <button class="u-button" data-variant="outline" data-size="sm">Batal</button>\n  <span class="u-badge" data-variant="success">Aktif</span>\n</template>`,
        },
        {
          label: 'Blade',
          language: 'html',
          code: `<link rel="stylesheet" href="{{ asset('vendor/unipo/ui-unipo.css') }}">\n\n<button class="u-button">Simpan</button>\n<div class="u-alert" data-variant="warning">\n  <div class="u-alert-body"><p class="u-alert-title">Periode KRS berakhir besok</p></div>\n</div>`,
        },
      ]}
    />
  );
}
