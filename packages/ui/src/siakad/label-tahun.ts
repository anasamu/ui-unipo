// Label periode akademik; modul sendiri supaya komponen akademik dan widget lama tidak saling mengimpor.
/** 20251 → "Ganjil 2025/2026". */
export function labelTahunAkademik(t?: string | null, pendek = false): string {
  if (!t || t.length !== 5) return t ?? '–';
  const th = Number(t.slice(0, 4));
  const smt = ({ '1': 'Ganjil', '2': 'Genap', '3': 'Pendek' } as Record<string, string>)[t[4]!] ?? 'Semester';
  return pendek ? `${smt} ${String(th).slice(2)}/${String(th + 1).slice(2)}` : `${smt} ${th}/${th + 1}`;
}
