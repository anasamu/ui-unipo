/**
 * Ringkasan tab "Pengatur" (Pustikom » Aturan & pengatur): pengatur per kategori dari GET /v1/aturan/pengatur
 * dikelompokkan supaya titik (langkah) yang pengaturnya sama tidak diulang satu per satu, dan izin teknis
 * (aturan:akademik, fakultas.aturan.kelola) tampil dengan nama awam. Fungsi murni (diuji di test/aturan-pengatur.test.ts).
 */

export interface BarisPengatur {
  titik: string | null;
  jenis: 'peran' | 'izin';
  kode: string;
  keterangan?: string | null;
}

export interface TitikRingkas {
  kode: string;
  judul: string;
  /** Kelompok bidang titik di katalog, mis. "PMB", "Akademik". */
  kelompok?: string;
}

export interface KelompokPengaturTitik {
  /** Titik (langkah) yang pengaturnya persis sama, urut judul. */
  titik: TitikRingkas[];
  peran: string[];
  izin: string[];
  /** Peran/izin yang ditambahkan di atas pengatur kategori. */
  tambahPeran: string[];
  tambahIzin: string[];
  /** Izin kategori yang TIDAK berlaku di langkah ini (pemegangnya saja tidak cukup). */
  kurangIzin: string[];
  /** true = semua peran pengatur kategori juga berlaku (kelompok hanya menambah); false = daftar pengganti. */
  mewarisi: boolean;
}

export interface RingkasPengatur {
  umum: { peran: string[]; izin: string[] };
  /** Titik yang pengaturnya sama dengan pengatur kategori (tidak perlu ditampilkan satu per satu). */
  samaDenganKategori: TitikRingkas[];
  khusus: KelompokPengaturTitik[];
}

const unik = (x: string[]) => [...new Set(x)].sort();

/** Kelompokkan baris pengatur satu kategori: umum (tanpa titik), titik yang sama dengan umum, dan kelompok titik khusus. */
export function ringkasPengatur(baris: BarisPengatur[], titikKatalog: (kode: string) => TitikRingkas | undefined, labelKelompokKategori?: string): RingkasPengatur {
  const per = new Map<string, BarisPengatur[]>();
  for (const b of baris) per.set(b.titik ?? '', [...(per.get(b.titik ?? '') ?? []), b]);
  const pisah = (r: BarisPengatur[]) => ({ peran: unik(r.filter((b) => b.jenis === 'peran').map((b) => b.kode)), izin: unik(r.filter((b) => b.jenis === 'izin').map((b) => b.kode)) });
  const umum = pisah(per.get('') ?? []);
  per.delete('');
  const kunci = (x: { peran: string[]; izin: string[] }) => `${x.peran.join(',')}|${x.izin.join(',')}`;
  const kunciUmum = kunci(umum);
  const sama: TitikRingkas[] = [];
  const kel = new Map<string, KelompokPengaturTitik>();
  for (const [kode, r] of per) {
    const t = titikKatalog(kode) ?? { kode, judul: kode };
    const isi = pisah(r);
    const k = kunci(isi);
    if (k === kunciUmum) {
      sama.push(t);
      continue;
    }
    if (!kel.has(k)) {
      const mewarisi = umum.peran.length > 0 ? umum.peran.every((p) => isi.peran.includes(p)) : umum.izin.length > 0 && umum.izin.every((i) => isi.izin.includes(i));
      kel.set(k, {
        titik: [],
        ...isi,
        tambahPeran: isi.peran.filter((p) => !umum.peran.includes(p)),
        tambahIzin: isi.izin.filter((i) => !umum.izin.includes(i)),
        kurangIzin: mewarisi ? umum.izin.filter((i) => !isi.izin.includes(i)) : [],
        mewarisi,
      });
    }
    kel.get(k)!.titik.push(t);
  }
  const urutJudul = (a: TitikRingkas, b: TitikRingkas) => a.judul.localeCompare(b.judul, 'id');
  const khusus = [...kel.values()].map((g) => ({ ...g, titik: g.titik.sort(urutJudul) }));
  // Kelompok dengan titik terbanyak di atas; kelompok di luar bidang kategori (mis. PMB di Akademik) sesudahnya.
  const luar = (g: KelompokPengaturTitik) => (labelKelompokKategori && g.titik.every((t) => t.kelompok && t.kelompok !== labelKelompokKategori) ? 1 : 0);
  khusus.sort((a, b) => luar(a) - luar(b) || b.titik.length - a.titik.length || urutJudul(a.titik[0], b.titik[0]));
  return { umum, samaDenganKategori: sama.sort(urutJudul), khusus };
}

const KATEGORI_AWAM: Record<string, string> = {
  akademik: 'akademik',
  kelulusan: 'kelulusan',
  keuangan: 'keuangan',
  kemahasiswaan: 'kemahasiswaan',
  kepegawaian: 'kepegawaian',
  mutu: 'mutu (SPMI)',
  penelitian: 'penelitian dan pengabdian',
  akun: 'akun pengguna',
  umum: 'umum',
};

/** Nama awam izin pengatur: aturan:akademik → "Mengatur aturan akademik"; selain itu nama izin RBAC, lalu kode. */
export function labelIzinPengatur(kode: string, namaRbac?: string | null): string {
  const m = /^aturan:([a-z_]+)$/.exec(kode);
  if (m) return `Mengatur aturan ${KATEGORI_AWAM[m[1]] ?? m[1].replace(/_/g, ' ')}`;
  if (kode === 'fakultas.aturan.kelola') return 'Mengatur aturan fakultas';
  if (namaRbac) return namaRbac;
  return kode;
}

/** Kalimat izin: "siapa pun yang punya izin Mengatur aturan akademik atau Mengatur aturan fakultas". */
export function kalimatIzinPengatur(kode: string[], nama: (k: string) => string | null | undefined = () => null): string {
  const l = kode.map((k) => labelIzinPengatur(k, nama(k)));
  if (!l.length) return '';
  const gabung = l.length === 1 ? l[0] : `${l.slice(0, -1).join(', ')} atau ${l[l.length - 1]}`;
  return `siapa pun yang punya izin ${gabung}`;
}
