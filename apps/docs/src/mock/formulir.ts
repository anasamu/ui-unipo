// Formulir per fitur: tulis (POST/PUT) ke kurikulum dan mata kuliah OBE dijawab server tiruan katalog, yang
// memvalidasi body dengan aturan backend yang sama (422 per isian). GET tetap memakai data contoh kurikulum.
import { KE_CADANGAN, LEWATI, tambahRute } from './siakad';

const tulis = (_u: URL, init?: RequestInit) => (!init?.method || init.method === 'GET' ? LEWATI : KE_CADANGAN);
tambahRute(/^\/v1\/kurikulum-obe\/kurikulum(\/\d+)?$/, tulis);
tambahRute(/^\/v1\/kurikulum-obe\/kurikulum\/\d+\/mk$/, tulis);
tambahRute(/^\/v1\/kurikulum-obe\/mk\/\d+$/, tulis);
