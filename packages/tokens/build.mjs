// Membangun design token UNIPO dari src/tokens.json ke berbagai platform.
// Tanpa dependensi: cukup `node build.mjs`.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = JSON.parse(readFileSync(join(root, 'src/tokens.json'), 'utf8'));
const out = join(root, 'dist');
mkdirSync(join(out, 'android'), { recursive: true });

const HEADER = 'Dibuat otomatis oleh @unipo/tokens dari src/tokens.json. Jangan diubah manual.';

/** "{primary.600}" -> "#244ce6" */
function resolve(value) {
  const m = /^\{([\w-]+)\.([\w-]+)\}$/.exec(value);
  if (!m) return value;
  const v = src.color[m[1]]?.[m[2]];
  if (!v) throw new Error(`Token tidak dikenal: ${value}`);
  return v;
}

const palette = []; // [nama, nilai]  mis. ['primary-600', '#244ce6']
for (const [group, scale] of Object.entries(src.color)) {
  if (Array.isArray(scale)) scale.forEach((v, i) => palette.push([`${group}-${i + 1}`, v]));
  else for (const [step, v] of Object.entries(scale)) palette.push([`${group}-${step}`, v]);
}
const themes = Object.fromEntries(
  Object.entries(src.theme).map(([mode, map]) => [mode, Object.entries(map).map(([k, v]) => [k, resolve(v)])]),
);
const px = (n) => (n === 0 ? '0' : `${n / 16}rem`);
const ms = (n) => `${n}ms`;

const scalar = [
  ...Object.entries(src.radius).map(([k, v]) => [`radius-${k}`, k === 'full' ? '9999px' : px(v)]),
  ...Object.entries(src.space).map(([k, v]) => [`space-${k}`, px(v)]),
  ...Object.entries(src.font).map(([k, v]) => [`font-${k}`, v]),
  ...Object.entries(src.fontSize).map(([k, v]) => [`text-${k}`, px(v)]),
  ...Object.entries(src.lineHeight).map(([k, v]) => [`leading-${k}`, String(v)]),
  ...Object.entries(src.fontWeight).map(([k, v]) => [`weight-${k}`, String(v)]),
  ...Object.entries(src.duration).map(([k, v]) => [`duration-${k}`, ms(v)]),
  ...Object.entries(src.easing).map(([k, v]) => [`ease-${k}`, v]),
];

// ---------- CSS ----------
const cssVars = (pairs, indent = '  ') => pairs.map(([k, v]) => `${indent}--u-${k}: ${v};`).join('\n');
writeFileSync(
  join(out, 'tokens.css'),
  `/* ${HEADER} */
:root {
${cssVars(palette)}
${cssVars(scalar)}
${cssVars(themes.light)}
  color-scheme: light;
}
.dark, [data-theme="dark"] {
${cssVars(themes.dark)}
  color-scheme: dark;
}
`,
);

// ---------- SCSS ----------
const scssName = (k) => `$u-${k}`;
writeFileSync(
  join(out, '_tokens.scss'),
  `// ${HEADER}
// Pakai: @use '@unipo/tokens/scss' with ($u-primary: #0f766e);
@use 'sass:string';
${palette.map(([k, v]) => `${scssName(k)}: ${v} !default;`).join('\n')}
${scalar.map(([k, v]) => `${scssName(k)}: ${/[",(]/.test(v) ? `string.unquote('${v.replace(/'/g, "\\'")}')` : v} !default;`).join('\n')}
${themes.light.map(([k, v]) => `${scssName(k)}: ${v} !default;`).join('\n')}
${themes.dark.map(([k, v]) => `${scssName('dark-' + k)}: ${v} !default;`).join('\n')}

@mixin u-light-vars {
${themes.light.map(([k]) => `  --u-${k}: #{${scssName(k)}};`).join('\n')}
}
@mixin u-dark-vars {
${themes.dark.map(([k]) => `  --u-${k}: #{${scssName('dark-' + k)}};`).join('\n')}
}
@mixin u-root-vars {
${palette.map(([k]) => `  --u-${k}: #{${scssName(k)}};`).join('\n')}
${scalar.map(([k]) => `  --u-${k}: #{${scssName(k)}};`).join('\n')}
}
`,
);

// ---------- LESS ----------
writeFileSync(
  join(out, 'tokens.less'),
  `// ${HEADER}
// LESS memakai evaluasi malas: impor berkas ini, lalu timpa variabel SETELAHNYA, mis. @u-primary: #0f766e;
${palette.map(([k, v]) => `@u-${k}: ${v};`).join('\n')}
${scalar.map(([k, v]) => `@u-${k}: ${/[",(]/.test(v) ? `~'${v.replace(/'/g, "\\'")}'` : v};`).join('\n')}
${themes.light.map(([k, v]) => `@u-${k}: ${v};`).join('\n')}
${themes.dark.map(([k, v]) => `@u-dark-${k}: ${v};`).join('\n')}

:root {
${palette.map(([k]) => `  --u-${k}: @u-${k};`).join('\n')}
${scalar.map(([k]) => `  --u-${k}: @u-${k};`).join('\n')}
${themes.light.map(([k]) => `  --u-${k}: @u-${k};`).join('\n')}
  color-scheme: light;
}
.dark, [data-theme="dark"] {
${themes.dark.map(([k]) => `  --u-${k}: @u-dark-${k};`).join('\n')}
  color-scheme: dark;
}
`,
);

// ---------- JS/TS (web, React Native, Node) ----------
const camel = (s) => s.replace(/-(\w)/g, (_, c) => c.toUpperCase());
const js = {
  color: src.color,
  light: Object.fromEntries(themes.light.map(([k, v]) => [camel(k), v])),
  dark: Object.fromEntries(themes.dark.map(([k, v]) => [camel(k), v])),
  radius: src.radius,
  space: src.space,
  fontSize: src.fontSize,
  lineHeight: src.lineHeight,
  fontWeight: src.fontWeight,
  duration: src.duration,
  breakpoint: src.breakpoint,
  fontFamily: { sans: 'PlusJakartaSans', heading: 'PlusJakartaSans', mono: 'JetBrainsMono' },
};
const jsBody = `export const tokens = ${JSON.stringify(js, null, 2)};
/** Warna semantik untuk mode terang/gelap, mis. di React Native: const c = colors(useColorScheme()); */
export function colors(mode) { return mode === 'dark' ? tokens.dark : tokens.light; }
export default tokens;
`;
writeFileSync(join(out, 'index.js'), `// ${HEADER}\n${jsBody}`);
writeFileSync(
  join(out, 'index.cjs'),
  `// ${HEADER}\n${jsBody.replace(/export const tokens/, 'const tokens').replace(/export function colors/, 'function colors').replace('export default tokens;', 'module.exports = { tokens, colors, default: tokens };')}`,
);
const semKeys = themes.light.map(([k]) => camel(k));
writeFileSync(
  join(out, 'index.d.ts'),
  `// ${HEADER}
export type ColorScale = Record<string, string>;
export interface SemanticColors { ${semKeys.map((k) => `${k}: string;`).join(' ')} }
export declare const tokens: {
  color: { primary: ColorScale; secondary: ColorScale; neutral: ColorScale; success: ColorScale; warning: ColorScale; danger: ColorScale; info: ColorScale; chart: string[] };
  light: SemanticColors;
  dark: SemanticColors;
  radius: Record<${Object.keys(src.radius).map((k) => `'${k}'`).join(' | ')}, number>;
  space: Record<string, number>;
  fontSize: Record<${Object.keys(src.fontSize).map((k) => `'${k}'`).join(' | ')}, number>;
  lineHeight: Record<'tight' | 'snug' | 'normal' | 'relaxed', number>;
  fontWeight: Record<'regular' | 'medium' | 'semibold' | 'bold', number>;
  duration: Record<'fast' | 'base' | 'slow', number>;
  breakpoint: Record<string, number>;
  fontFamily: { sans: string; heading: string; mono: string };
};
export declare function colors(mode?: 'light' | 'dark' | null): SemanticColors;
export default tokens;
`,
);

// ---------- Kotlin (Jetpack Compose, Material 3) ----------
const kColor = (hex) => `Color(0xFF${hex.slice(1).toUpperCase()})`;
const kName = (k) => camel(k).replace(/^(\w)/, (c) => c.toUpperCase()).replace(/-/g, '');
writeFileSync(
  join(out, 'UnipoTheme.kt'),
  `// ${HEADER}
// Salin ke modul Android Anda (mis. ui/theme/UnipoTheme.kt) lalu bungkus layar dengan UnipoTheme { ... }.
package id.ac.unipo.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

object UnipoColors {
${palette.map(([k, v]) => `    val ${kName(k.replace(/-(\d)/, '_$1'))} = ${kColor(v)}`).join('\n')}
}

object UnipoRadius {
${Object.entries(src.radius).filter(([k]) => k !== 'full').map(([k, v]) => `    val ${k === '2xl' ? 'Xl2' : kName(k)} = ${v}.dp`).join('\n')}
}

object UnipoSpace {
${Object.entries(src.space).map(([k, v]) => `    val S${k} = ${v}.dp`).join('\n')}
}

private val Light = lightColorScheme(
    primary = ${kColor(resolve(src.theme.light.primary))},
    onPrimary = ${kColor(resolve(src.theme.light['primary-foreground']))},
    secondary = ${kColor(resolve(src.theme.light.secondary))},
    onSecondary = ${kColor(resolve(src.theme.light['secondary-foreground']))},
    background = ${kColor(resolve(src.theme.light.background))},
    onBackground = ${kColor(resolve(src.theme.light.foreground))},
    surface = ${kColor(resolve(src.theme.light.background))},
    onSurface = ${kColor(resolve(src.theme.light.foreground))},
    surfaceVariant = ${kColor(resolve(src.theme.light.muted))},
    onSurfaceVariant = ${kColor(resolve(src.theme.light['muted-foreground']))},
    outline = ${kColor(resolve(src.theme.light.input))},
    outlineVariant = ${kColor(resolve(src.theme.light.border))},
    error = ${kColor(resolve(src.theme.light.danger))},
)

private val Dark = darkColorScheme(
    primary = ${kColor(resolve(src.theme.dark.primary))},
    onPrimary = ${kColor(resolve(src.theme.dark['primary-foreground']))},
    secondary = ${kColor(resolve(src.theme.dark.secondary))},
    onSecondary = ${kColor(resolve(src.theme.dark['secondary-foreground']))},
    background = ${kColor(resolve(src.theme.dark.background))},
    onBackground = ${kColor(resolve(src.theme.dark.foreground))},
    surface = ${kColor(resolve(src.theme.dark.surface))},
    onSurface = ${kColor(resolve(src.theme.dark.foreground))},
    surfaceVariant = ${kColor(resolve(src.theme.dark.muted))},
    onSurfaceVariant = ${kColor(resolve(src.theme.dark['muted-foreground']))},
    outline = ${kColor(resolve(src.theme.dark.input))},
    outlineVariant = ${kColor(resolve(src.theme.dark.border))},
    error = ${kColor(resolve(src.theme.dark.danger))},
)

private val UnipoShapes = Shapes(
    small = RoundedCornerShape(${src.radius.sm}.dp),
    medium = RoundedCornerShape(${src.radius.base}.dp),
    large = RoundedCornerShape(${src.radius.xl}.dp),
)

@Composable
fun UnipoTheme(darkTheme: Boolean = isSystemInDarkTheme(), content: @Composable () -> Unit) {
    MaterialTheme(colorScheme = if (darkTheme) Dark else Light, shapes = UnipoShapes, content = content)
}
`,
);

// ---------- Android XML ----------
writeFileSync(
  join(out, 'android/colors.xml'),
  `<?xml version="1.0" encoding="utf-8"?>
<!-- ${HEADER} -->
<resources>
${palette.map(([k, v]) => `    <color name="unipo_${k.replace(/-/g, '_')}">${v}</color>`).join('\n')}
${themes.light.map(([k, v]) => `    <color name="unipo_${k.replace(/-/g, '_')}">${v}</color>`).join('\n')}
</resources>
`,
);

// ---------- Tailwind preset (v3 & v4 lewat @config) ----------
const scaleVars = (g) =>
  Object.fromEntries(Object.keys(src.color[g]).map((s) => [s, `var(--u-${g}-${s})`]));
const tw = {
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'var(--u-primary)', foreground: 'var(--u-primary-foreground)', ...scaleVars('primary') },
        secondary: { DEFAULT: 'var(--u-secondary)', foreground: 'var(--u-secondary-foreground)', ...scaleVars('secondary') },
        neutral: scaleVars('neutral'),
        background: 'var(--u-background)',
        foreground: 'var(--u-foreground)',
        surface: 'var(--u-surface)',
        muted: { DEFAULT: 'var(--u-muted)', foreground: 'var(--u-muted-foreground)' },
        border: 'var(--u-border)',
        input: 'var(--u-input)',
        success: 'var(--u-success)',
        warning: 'var(--u-warning)',
        danger: 'var(--u-danger)',
        info: 'var(--u-info)',
      },
      borderRadius: Object.fromEntries(Object.keys(src.radius).map((k) => [k === 'base' ? 'DEFAULT' : k, `var(--u-radius-${k})`])),
      fontFamily: { sans: ['var(--u-font-sans)'], heading: ['var(--u-font-heading)'], mono: ['var(--u-font-mono)'] },
    },
  },
};
writeFileSync(join(out, 'tailwind-preset.cjs'), `// ${HEADER}\nmodule.exports = ${JSON.stringify(tw, null, 2)};\n`);

// ---------- JSON hasil resolusi ----------
writeFileSync(join(out, 'tokens.resolved.json'), JSON.stringify({ palette: Object.fromEntries(palette), light: Object.fromEntries(themes.light), dark: Object.fromEntries(themes.dark), scalar: Object.fromEntries(scalar) }, null, 2));

console.log(`@unipo/tokens: ${palette.length} warna, ${themes.light.length} token semantik, ${scalar.length} token skalar → dist/`);
