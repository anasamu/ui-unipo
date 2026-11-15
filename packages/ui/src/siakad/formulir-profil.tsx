'use client';
import * as React from 'react';
import { AtSign, Link2, Sparkles, UserRound } from 'lucide-react';
import { Field, Input, Textarea } from '../components/forms';
import { BagianForm, HitungKarakter, IsianDaftar, PanelForm } from '../components/formulir';
import { useToast } from '../components/overlays';
import { invalidateSiakad, useSiakad } from './provider';
import { useProfilSaya } from './profil-modul';

/** Jenis tautan profil yang diterima backend (ProfilController::TAUTAN). */
export const TAUTAN_PROFIL: Array<{ jenis: string; label: string; contoh: string }> = [
  { jenis: 'linkedin', label: 'LinkedIn', contoh: 'https://www.linkedin.com/in/nama' },
  { jenis: 'orcid', label: 'ORCID', contoh: 'https://orcid.org/0000-0000-0000-0000' },
  { jenis: 'scholar', label: 'Google Scholar', contoh: 'https://scholar.google.com/citations?user=…' },
  { jenis: 'sinta', label: 'SINTA', contoh: 'https://sinta.kemdiktisaintek.go.id/authors/profile/…' },
  { jenis: 'scopus', label: 'Scopus', contoh: 'https://www.scopus.com/authid/detail.uri?authorId=…' },
  { jenis: 'garuda', label: 'Garuda', contoh: 'https://garuda.kemdiktisaintek.go.id/author/view/…' },
  { jenis: 'researchgate', label: 'ResearchGate', contoh: 'https://www.researchgate.net/profile/…' },
  { jenis: 'github', label: 'GitHub', contoh: 'https://github.com/nama' },
  { jenis: 'situs', label: 'Situs pribadi', contoh: 'https://nama.id' },
];

interface IsiProfil {
  nama_panggilan: string;
  judul: string;
  bio: string;
  email_alternatif: string;
  keahlian: string[];
  tautan: Record<string, string>;
}

/** Validasi sisi peramban yang sama dengan POST /v1/profil/saya (ProfilController::simpanProfil). */
export function periksaProfilSaya(x: IsiProfil): Record<string, string> {
  const g: Record<string, string> = {};
  if (x.nama_panggilan.length > 60) g.nama_panggilan = 'Maksimal 60 karakter.';
  if (x.judul.length > 150) g.judul = 'Maksimal 150 karakter.';
  if (x.bio.length > 2000) g.bio = 'Maksimal 2000 karakter.';
  if (x.email_alternatif && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.email_alternatif)) g.email_alternatif = 'Alamat email tidak sah.';
  if (x.keahlian.length > 30) g.keahlian = 'Maksimal 30 keahlian.';
  if (x.keahlian.some((k) => k.length > 60)) g.keahlian = 'Satu keahlian maksimal 60 karakter.';
  for (const [j, url] of Object.entries(x.tautan)) {
    if (url && (url.length > 255 || !/^https?:\/\/[^\s]+\.[^\s]+/i.test(url))) g[`tautan.${j}`] = 'Alamat harus diawali https://';
  }
  return g;
}

export interface FormProfilSayaProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactElement;
  onTersimpan?: () => void;
  /** Sembunyikan bagian tautan akademik (mis. untuk mahasiswa). Bawaan: tampil untuk dosen dan tendik. */
  tautan?: boolean;
}

/**
 * Ubah profil tampilan akun yang masuk (POST /v1/profil/saya): nama panggilan, judul singkat, bio, keahlian,
 * tautan akademik/profesional, dan email alternatif. Data induk (NIK, alamat) diubah lewat DataPribadiSaya.
 */
export function FormProfilSaya({ open, onOpenChange, trigger, onTersimpan, tautan: tautanProp }: FormProfilSayaProps) {
  const q = useProfilSaya();
  const siakad = useSiakad();
  const toast = useToast();
  const awal = React.useMemo<IsiProfil>(() => {
    const p = q.data?.profil ?? {};
    return {
      nama_panggilan: String(p.nama_panggilan ?? ''),
      judul: String(p.judul ?? ''),
      bio: String(p.bio ?? ''),
      email_alternatif: String((p as Record<string, unknown>).email_alternatif ?? ''),
      keahlian: Array.isArray(p.keahlian) ? p.keahlian.map(String) : [],
      tautan: { ...((p as Record<string, unknown>).tautan as Record<string, string> | undefined) },
    };
  }, [q.data]);
  const [isi, setIsi] = React.useState<IsiProfil>(awal);
  const [galat, setGalat] = React.useState<Record<string, string>>({});
  const [inner, setInner] = React.useState(false);
  const isOpen = open ?? inner;
  React.useEffect(() => {
    if (isOpen) {
      setIsi(awal);
      setGalat({});
    }
  }, [isOpen, awal]);
  const ubah = <K extends keyof IsiProfil>(k: K, v: IsiProfil[K]) => {
    setIsi((x) => ({ ...x, [k]: v }));
    setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
  };
  const periksa = (k: string) => setGalat((g) => ({ ...g, [k]: periksaProfilSaya(isi)[k] ?? '' }));
  const berubah = JSON.stringify(isi) !== JSON.stringify(awal);
  const tampilTautan = tautanProp ?? (q.data ? q.data.identitas.peran !== 'mahasiswa' : true);

  return (
    <PanelForm
      open={isOpen}
      onOpenChange={(o) => {
        setInner(o);
        onOpenChange?.(o);
      }}
      trigger={trigger}
      title="Ubah profil"
      description="Tampil di kartu profil, direktori dosen, dan aplikasi kampus lain."
      berubah={berubah}
      labelSimpan="Simpan profil"
      disabled={!q.data}
      onSimpan={async () => {
        const g = periksaProfilSaya(isi);
        setGalat(g);
        if (Object.values(g).some(Boolean)) {
          const k = Object.keys(g)[0];
          requestAnimationFrame(() => document.getElementById(`profil-${k.replace('.', '-')}`)?.focus());
          return 'Periksa isian yang ditandai.';
        }
        const body: Record<string, unknown> = {
          nama_panggilan: isi.nama_panggilan.trim() || null,
          judul: isi.judul.trim() || null,
          bio: isi.bio.trim() || null,
          email_alternatif: isi.email_alternatif.trim() || null,
          keahlian: isi.keahlian,
        };
        if (tampilTautan)
          body.tautan = Object.fromEntries(
            Object.entries(isi.tautan)
              .map(([k, v]) => [k, v.trim()])
              .filter(([, v]) => v),
          );
        try {
          await siakad.request({ method: 'POST', path: '/v1/profil/saya', body });
        } catch (e) {
          const f = (e as { fields?: Record<string, unknown> }).fields;
          if (f) {
            setGalat(Object.fromEntries(Object.entries(f).map(([k, v]) => [k, String(v)])));
            return 'Periksa isian yang ditandai.';
          }
          throw e;
        }
        invalidateSiakad('profil');
        toast.add({ title: 'Profil tersimpan', type: 'success' });
        onTersimpan?.();
      }}
    >
      <BagianForm judul="Tampilan profil" keterangan="Nama panggilan dipakai di sapaan beranda dan menu akun." ikon={<UserRound />}>
        <Field label="Nama panggilan" optional error={galat.nama_panggilan || undefined}>
          <Input
            id="profil-nama_panggilan"
            value={isi.nama_panggilan}
            maxLength={60}
            placeholder="Mis. Nurul"
            onChange={(e) => ubah('nama_panggilan', e.target.value)}
            onBlur={() => periksa('nama_panggilan')}
          />
        </Field>
        <Field label="Judul singkat" optional description="Jabatan, bidang, atau peran Anda." error={galat.judul || undefined}>
          <Input
            id="profil-judul"
            value={isi.judul}
            maxLength={150}
            placeholder="Mis. Lektor · Rekayasa perangkat lunak"
            onChange={(e) => ubah('judul', e.target.value)}
            onBlur={() => periksa('judul')}
          />
        </Field>
        <Field
          label={
            <>
              Bio <HitungKarakter nilai={isi.bio} maks={2000} />
            </>
          }
          optional
          className="u-form-lebar"
          error={galat.bio || undefined}
        >
          <Textarea
            id="profil-bio"
            value={isi.bio}
            rows={5}
            placeholder="Ceritakan singkat tentang diri, minat, atau pengalaman Anda."
            onChange={(e) => ubah('bio', e.target.value)}
            onBlur={() => periksa('bio')}
          />
        </Field>
      </BagianForm>
      <BagianForm judul="Keahlian" keterangan="Ketik lalu tekan Enter. Maksimal 30, dipakai untuk pencarian pakar dan pembimbing." ikon={<Sparkles />}>
        <Field label="Bidang keahlian" optional className="u-form-lebar" error={galat.keahlian || undefined}>
          <IsianDaftar id="profil-keahlian" value={isi.keahlian} onValueChange={(v) => ubah('keahlian', v.slice(0, 30))} />
        </Field>
      </BagianForm>
      {tampilTautan && (
        <BagianForm judul="Tautan akademik dan profesional" keterangan="Kosongkan yang tidak dipakai. Alamat harus diawali https://." ikon={<Link2 />} kolom={1}>
          <div className="u-form-tautan">
            {TAUTAN_PROFIL.map((t) => {
              const k = `tautan.${t.jenis}`;
              return (
                <Field key={t.jenis} className="u-form-tautan-baris" error={galat[k] || undefined}>
                  <label htmlFor={`profil-tautan-${t.jenis}`}>{t.label}</label>
                  <Input
                    id={`profil-tautan-${t.jenis}`}
                    type="url"
                    inputMode="url"
                    value={isi.tautan[t.jenis] ?? ''}
                    placeholder={t.contoh}
                    onChange={(e) => {
                      setIsi((x) => ({ ...x, tautan: { ...x.tautan, [t.jenis]: e.target.value } }));
                      setGalat((g) => (g[k] ? { ...g, [k]: '' } : g));
                    }}
                    onBlur={() => periksa(k)}
                  />
                </Field>
              );
            })}
          </div>
        </BagianForm>
      )}
      <BagianForm judul="Kontak tambahan" ikon={<AtSign />}>
        <Field label="Email alternatif" optional description="Untuk pemulihan akun dan pemberitahuan bila email kampus tidak aktif." error={galat.email_alternatif || undefined}>
          <Input
            id="profil-email_alternatif"
            type="email"
            inputMode="email"
            value={isi.email_alternatif}
            placeholder="nama@contoh.com"
            onChange={(e) => ubah('email_alternatif', e.target.value)}
            onBlur={() => periksa('email_alternatif')}
          />
        </Field>
      </BagianForm>
    </PanelForm>
  );
}
