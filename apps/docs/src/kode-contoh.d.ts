export interface BerkasContoh {
  nama: string;
  bahasa: string;
  kode: string;
}
export function uraiImpor(src: string): Array<{ dari: string; nama: Array<{ asli: string; lokal: string; tipe: boolean }>; bawaan: string | null; ns: string | null; tipe: boolean }>;
export function imporUntuk(src: string, kode: string): { teks: string; ui: Array<{ nama: string; dari: string }> };
export function barisSdk(ep: string): string;
export function sdkTs(perKomponen: Record<string, string[]>): string;
export function berkasContoh(src: string, nama: string, kode: string, petaSdk: Record<string, string[]>): BerkasContoh[];
