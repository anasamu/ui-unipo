type Part = string | false | null | undefined | 0;
type StatefulClass<S> = (state: S) => string | undefined;

/**
 * Gabungkan nama kelas; nilai falsy diabaikan. Bila salah satu bagian berupa fungsi
 * (className bergantung state pada komponen Base UI), hasilnya juga fungsi.
 */
export function cn(...parts: Part[]): string;
export function cn<S>(...parts: Array<Part | StatefulClass<S>>): string | ((state: S) => string);
export function cn<S>(...parts: Array<Part | StatefulClass<S>>): string | ((state: S) => string) {
  if (parts.some((p) => typeof p === 'function')) {
    return (state: S) =>
      parts
        .map((p) => (typeof p === 'function' ? p(state) : p))
        .filter(Boolean)
        .join(' ');
  }
  return parts.filter(Boolean).join(' ');
}

/** Atribut data boolean: true -> "" (ada), false/undefined -> tidak dirender. */
export function dataFlag(v: boolean | undefined): '' | undefined {
  return v ? '' : undefined;
}
