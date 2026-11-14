import tokens from '@unipo/tokens/json';
import { CodeBlock } from '@unipo/ui';
import type { DemoMeta } from '../registry';

export const meta: DemoMeta = {
  title: 'Warna & tema',
  category: 'Fondasi',
  order: 1,
  description: 'Semua warna berasal dari token. Komponen hanya membaca variabel CSS --u-*, jadi tema bisa diganti saat runtime, saat build (Sass/LESS), atau per bagian halaman.',
  layout: 'wide',
  demos: { Palet: 'Palet dasar', Semantik: 'Token semantik', GantiTema: 'Mengganti tema', Platform: 'Token di platform lain' },
};

const SCALES = ['primary', 'secondary', 'neutral'] as const;

export function Palet() {
  return (
    <div className="demo-stack">
      {SCALES.map((s) => (
        <div key={s}>
          <div className="u-label" style={{ marginBottom: 8, textTransform: 'capitalize' }}>{s}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(11, minmax(0, 1fr))', gap: 6 }}>
            {Object.entries(tokens.color[s]).filter(([k]) => k !== '0').map(([k, v]) => (
              <div key={k}>
                <div style={{ height: 44, borderRadius: 8, background: `var(--u-${s}-${k})`, boxShadow: 'inset 0 0 0 1px rgb(0 0 0 / .06)' }} />
                <div style={{ fontSize: 11, marginTop: 4, fontWeight: 600 }}>{k}</div>
                <div className="u-mono" style={{ fontSize: 10, color: 'var(--u-muted-foreground)' }}>{v as string}</div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const SEMANTIC = ['background', 'surface', 'muted', 'border', 'foreground', 'muted-foreground', 'primary', 'primary-soft', 'secondary', 'secondary-soft', 'success', 'warning', 'danger', 'info'];

export function Semantik() {
  return (
    <div className="demo-grid" style={{ ['--min' as string]: '10rem' }}>
      {SEMANTIC.map((t) => (
        <div key={t} className="u-card" data-variant="flat" style={{ overflow: 'hidden' }}>
          <div style={{ height: 56, background: `var(--u-${t})`, borderBottom: '1px solid var(--u-border)' }} />
          <div style={{ padding: '8px 10px' }}>
            <code className="u-mono" style={{ fontSize: 12 }}>--u-{t}</code>
          </div>
        </div>
      ))}
    </div>
  );
}

export function GantiTema() {
  return (
    <CodeBlock
      tabs={[
        { label: 'CSS (runtime)', language: 'css', code: `/* Satu baris sudah cukup: hover, soft, ring, dan fokus ikut dihitung dengan color-mix() */\n:root {\n  --u-primary: #0f766e;\n  --u-secondary: #f59e0b;\n  --u-radius: 0.5rem;\n}\n\n/* Tema khusus satu bagian halaman */\n.portal-fakultas-teknik {\n  --u-primary: #b45309;\n}` },
        { label: 'Sass', language: 'scss', code: `// Kompilasi ulang CSS dengan warna kampus/fakultas sendiri\n@use '@unipo/ui/scss' with (\n  $u-primary: #0f766e,\n  $u-secondary: #f59e0b,\n  $u-radius-base: 0.5rem,\n  $u-font-sans: ('Inter', sans-serif)\n);` },
        { label: 'LESS', language: 'less', code: `// LESS memakai evaluasi malas: timpa SETELAH impor\n@import '@unipo/tokens/less';\n@u-primary: #0f766e;\n@u-secondary: #f59e0b;\n\n// lalu muat CSS komponen\n@import (css) '@unipo/ui/css';` },
        { label: 'Tailwind', language: 'js', code: `// tailwind.config.js  ->  bg-primary, text-muted-foreground, rounded, ...\nmodule.exports = {\n  presets: [require('@unipo/tokens/tailwind')],\n  content: ['./src/**/*.{ts,tsx}'],\n};` },
      ]}
    />
  );
}

export function Platform() {
  return (
    <CodeBlock
      tabs={[
        { label: 'React Native', language: 'tsx', code: `import { useColorScheme, Pressable, Text } from 'react-native';\nimport { colors, tokens } from '@unipo/tokens';\n\nexport function TombolUtama({ title, onPress }) {\n  const c = colors(useColorScheme());\n  return (\n    <Pressable\n      onPress={onPress}\n      style={{ backgroundColor: c.primary, borderRadius: tokens.radius.base, paddingVertical: tokens.space[3] }}\n    >\n      <Text style={{ color: c.primaryForeground, fontWeight: '600', textAlign: 'center' }}>{title}</Text>\n    </Pressable>\n  );\n}` },
        { label: 'Kotlin (Compose)', language: 'kotlin', code: `// Salin node_modules/@unipo/tokens/dist/UnipoTheme.kt ke modul Android\nimport id.ac.unipo.ui.theme.UnipoTheme\nimport id.ac.unipo.ui.theme.UnipoColors\n\nsetContent {\n    UnipoTheme {\n        Button(onClick = { kirim() }) { Text("Simpan KRS") }\n        Text("Aktif", color = UnipoColors.Success_600)\n    }\n}` },
        { label: 'Android XML', language: 'html', code: `<!-- dist/android/colors.xml -->\n<TextView\n    android:textColor="@color/unipo_primary"\n    android:background="@color/unipo_surface" />` },
        { label: 'Token JSON', language: 'json', code: JSON.stringify({ color: { primary: { '600': tokens.color.primary['600'] } }, radius: tokens.radius, theme: { light: { primary: '{primary.600}' } } }, null, 2) },
      ]}
    />
  );
}
