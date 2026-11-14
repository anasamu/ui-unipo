'use client';
import * as React from 'react';
import { Check, Copy } from 'lucide-react';
import { cn, dataFlag } from '../lib/cn';

// ---------------------------------------------------------------- Pewarnaan sintaks ringan (tanpa dependensi)
export type CodeLanguage = 'json' | 'js' | 'ts' | 'jsx' | 'tsx' | 'bash' | 'shell' | 'curl' | 'python' | 'php' | 'kotlin' | 'scss' | 'css' | 'less' | 'html' | 'vue' | 'text';

type Tok = { t: string; c?: string };

const KEYWORDS: Record<string, string[]> = {
  js: 'const let var function return if else for while of in new await async import from export default class extends try catch finally throw typeof instanceof null undefined true false this =>'.split(' '),
  python: 'def return if elif else for while in import from as class try except finally raise with None True False and or not lambda async await print'.split(' '),
  php: 'function return if else foreach as new use namespace class public private protected static try catch throw null true false echo fn array'.split(' '),
  kotlin: 'fun val var return if else when for while in import package class object data private override null true false'.split(' '),
  bash: 'curl npm npx pnpm yarn composer php git cd export echo sudo'.split(' '),
};

function langFamily(lang: CodeLanguage): keyof typeof KEYWORDS | 'json' | 'css' | 'html' | 'text' {
  if (lang === 'ts' || lang === 'jsx' || lang === 'tsx' || lang === 'vue') return 'js';
  if (lang === 'shell' || lang === 'curl') return 'bash';
  if (lang === 'scss' || lang === 'less') return 'css';
  return lang as never;
}

export function tokenize(code: string, lang: CodeLanguage): Tok[][] {
  const fam = langFamily(lang);
  const kw = new Set(KEYWORDS[fam as keyof typeof KEYWORDS] ?? []);
  const comment = fam === 'python' || fam === 'bash' ? /#[^\n]*/y : fam === 'html' ? /<!--[\s\S]*?-->/y : /\/\/[^\n]*|\/\*[\s\S]*?\*\//y;
  const rules: Array<[RegExp, string | ((m: string, rest: string) => string)]> = [
    [comment, 'comment'],
    [/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`/y, (_m, rest) => (fam === 'json' && /^\s*:/.test(rest) ? 'property' : 'string')],
    [/-?\b\d+(?:\.\d+)?\b/y, 'number'],
    [/\$[A-Za-z_][\w]*|@[\w-]+/y, 'variable'],
    [/--?[A-Za-z][\w-]*/y, fam === 'bash' ? 'attr' : fam === 'css' ? 'property' : 'punct'],
    [/<\/?[A-Za-z][\w.-]*|\/?>/y, fam === 'html' || fam === 'js' ? 'tag' : 'punct'],
    [/[A-Za-z_][\w]*/y, (m, rest) => (kw.has(m) ? 'keyword' : /^\s*\(/.test(rest) ? 'function' : fam === 'js' && /^[A-Z]/.test(m) ? 'type' : fam === 'css' && /^\s*:/.test(rest) ? 'property' : '')],
    [/\s+/y, ''],
    [/[{}[\]();,.:=+\-*/<>!?&|%^~]/y, 'punct'],
    [/./y, ''],
  ];
  const lines: Tok[][] = [[]];
  let i = 0;
  while (i < code.length) {
    let matched = false;
    for (const [re, cls] of rules) {
      re.lastIndex = i;
      const m = re.exec(code);
      if (!m || !m[0]) continue;
      const text = m[0];
      const c = typeof cls === 'function' ? cls(text, code.slice(i + text.length, i + text.length + 3)) : cls;
      text.split('\n').forEach((part, k) => {
        if (k > 0) lines.push([]);
        if (part) lines[lines.length - 1].push({ t: part, c: c || undefined });
      });
      i += text.length;
      matched = true;
      break;
    }
    if (!matched) i++;
  }
  return lines;
}

// ---------------------------------------------------------------- Salin ke papan klip
export function useCopy(timeout = 1600) {
  const [copied, setCopied] = React.useState(false);
  const copy = React.useCallback(
    async (text: string) => {
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
      }
      setCopied(true);
      setTimeout(() => setCopied(false), timeout);
    },
    [timeout],
  );
  return { copied, copy };
}

export function CopyButton({ text, className, label = 'Salin' }: { text: string; className?: string; label?: string }) {
  const { copied, copy } = useCopy();
  return (
    <button type="button" className={cn('u-code-copy', className)} onClick={() => copy(text)} aria-label={copied ? 'Tersalin' : label} title={copied ? 'Tersalin' : label} data-copied={dataFlag(copied)}>
      {copied ? <Check /> : <Copy />}
    </button>
  );
}

// ---------------------------------------------------------------- CodeBlock
export interface CodeSnippet {
  /** Label tab, mis. "cURL", "JavaScript". */
  label: string;
  language: CodeLanguage;
  code: string;
  /** Nama berkas yang ditampilkan di kepala blok (opsional). */
  filename?: string;
}

export interface CodeBlockProps {
  /** Satu potongan kode... */
  code?: string;
  language?: CodeLanguage;
  filename?: string;
  /** ...atau beberapa tab (cURL / JavaScript / Python / JSON). */
  tabs?: CodeSnippet[];
  defaultTab?: number;
  lineNumbers?: boolean;
  /** Nomor baris yang disorot, mis. [2, 3]. */
  highlightLines?: number[];
  /** Hiasan tiga titik ala jendela. */
  windowControls?: boolean;
  /** Tinggi maksimum sebelum menggulir. */
  maxHeight?: number | string;
  /** Tema blok: 'dark' (bawaan, cocok untuk dokumentasi API) atau 'auto' mengikuti tema halaman. */
  theme?: 'dark' | 'auto';
  wrap?: boolean;
  className?: string;
}

/**
 * Blok kode dengan tab bahasa, nomor baris, pewarnaan sintaks, dan tombol salin.
 * Untuk dokumentasi API (contoh permintaan + jawaban), panduan instalasi, dan halaman pengembang.
 */
export function CodeBlock({ code, language = 'text', filename, tabs, defaultTab = 0, lineNumbers = true, highlightLines, windowControls = true, maxHeight, theme = 'dark', wrap, className }: CodeBlockProps) {
  const snippets: CodeSnippet[] = tabs ?? [{ label: filename ?? language.toUpperCase(), language, code: code ?? '', filename }];
  const [active, setActive] = React.useState(Math.min(defaultTab, snippets.length - 1));
  const cur = snippets[active];
  const text = cur.code.replace(/\n$/, '');
  const lines = React.useMemo(() => tokenize(text, cur.language), [text, cur.language]);
  const hl = new Set(highlightLines);
  const tabId = React.useId();
  return (
    <div className={cn('u-code', className)} data-theme={theme === 'dark' ? 'code-dark' : undefined} data-wrap={dataFlag(wrap)}>
      <div className="u-code-header">
        {windowControls && (
          <span className="u-code-dots" aria-hidden>
            <span />
            <span />
            <span />
          </span>
        )}
        {tabs ? (
          <div className="u-code-tabs" role="tablist" aria-label="Bahasa">
            {snippets.map((s, i) => (
              <button
                key={s.label}
                type="button"
                role="tab"
                id={`${tabId}-${i}`}
                aria-selected={i === active}
                tabIndex={i === active ? 0 : -1}
                className="u-code-tab"
                onClick={() => setActive(i)}
                onKeyDown={(e) => {
                  if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
                  const n = (active + (e.key === 'ArrowRight' ? 1 : -1) + snippets.length) % snippets.length;
                  setActive(n);
                  (e.currentTarget.parentElement?.children[n] as HTMLElement | undefined)?.focus();
                }}
              >
                {s.label}
              </button>
            ))}
          </div>
        ) : (
          <span className="u-code-filename">{cur.filename ?? cur.label}</span>
        )}
        <CopyButton text={text} />
      </div>
      <pre className="u-code-body" style={{ maxHeight }} role={tabs ? 'tabpanel' : undefined} aria-labelledby={tabs ? `${tabId}-${active}` : undefined} tabIndex={0}>
        <code>
          {lines.map((line, i) => (
            <span key={i} className="u-code-line" data-highlight={dataFlag(hl.has(i + 1))}>
              {lineNumbers && <span className="u-code-ln" aria-hidden>{i + 1}</span>}
              <span className="u-code-text">
                {line.length ? line.map((tok, k) => (tok.c ? <span key={k} className={`u-tok-${tok.c}`}>{tok.t}</span> : tok.t)) : ' '}
              </span>
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/** Kode sebaris, mis. `npm install unipo-ui`, dengan tombol salin opsional. */
export function InlineCode({ children, copyable, className }: { children: string; copyable?: boolean; className?: string }) {
  if (!copyable) return <code className={cn('u-inline-code', className)}>{children}</code>;
  return (
    <span className={cn('u-inline-code', className)} data-copyable="">
      <code>{children}</code>
      <CopyButton text={children} />
    </span>
  );
}
