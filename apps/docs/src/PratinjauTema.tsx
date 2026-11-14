import * as React from 'react';
import { BookOpen, GraduationCap, Plus, Search, Users } from 'lucide-react';
import {
  Alert,
  Avatar,
  Badge,
  BarChart,
  Button,
  Card,
  CardContent,
  CardHeader,
  CellPrimary,
  Checkbox,
  Field,
  Input,
  InputGroup,
  Progress,
  SegmentedControl,
  Select,
  StatCard,
  Switch,
  Table,
  TableContainer,
  Tabs,
} from 'unipo-ui';

const MHS = [
  { nama: 'Nur Aisyah Hasan', nim: '2201041', prodi: 'Teknik Informatika', ipk: 3.82, status: 'Aktif' },
  { nama: 'Rahmat Pakaya', nim: '2201057', prodi: 'Manajemen', ipk: 3.41, status: 'Cuti' },
  { nama: 'Sri Wahyuni Lamato', nim: '2101112', prodi: 'Hukum', ipk: 3.67, status: 'Aktif' },
  { nama: 'Fadli Mohammad', nim: '2001009', prodi: 'Agribisnis', ipk: 2.95, status: 'Nonaktif' },
];
const NADA: Record<string, 'success' | 'warning' | 'neutral'> = { Aktif: 'success', Cuti: 'warning', Nonaktif: 'neutral' };

/**
 * Satu layar berisi komponen yang paling sering dipakai (tombol, isian, kartu statistik, tabel, peringatan, grafik),
 * untuk menilai tema sekilas. Dipakai sebagai pratinjau di pembuat tema api.unipo.ac.id (#/pratinjau-tema).
 */
export function PratinjauTema() {
  const [tab, setTab] = React.useState('ringkasan');
  return (
    <div className="docs-pratinjau">
      <div className="docs-pratinjau-head">
        <div>
          <p className="docs-eyebrow">Semester Ganjil 2026/2027</p>
          <h1>Dasbor akademik</h1>
          <p className="docs-lead">Contoh tampilan untuk menilai tema: warna, sudut, huruf, ukuran teks, bayangan.</p>
        </div>
        <div className="docs-pratinjau-aksi">
          <Button variant="outline">Unduh laporan</Button>
          <Button>
            <Plus /> Tambah mahasiswa
          </Button>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={setTab}
        items={[
          { value: 'ringkasan', label: 'Ringkasan' },
          { value: 'mahasiswa', label: 'Mahasiswa' },
          { value: 'jadwal', label: 'Jadwal' },
        ]}
      />

      <div className="docs-pratinjau-stat">
        <StatCard label="Mahasiswa aktif" value="4.218" delta={3.2} icon={<Users />} trend={[30, 34, 33, 38, 41, 40, 44]} />
        <StatCard label="Kelas berjalan" value="312" delta={-1.4} icon={<BookOpen />} trend={[20, 22, 21, 19, 20, 18, 19]} />
        <StatCard label="Calon wisudawan" value="486" delta={8.9} icon={<GraduationCap />} tone="success" trend={[10, 12, 15, 14, 18, 21, 24]} />
      </div>

      <div className="docs-pratinjau-grid">
        <Card>
          <CardHeader title="Daftar mahasiswa" description="Diperbarui 5 menit lalu" action={<Badge variant="primary">4 data</Badge>} />
          <CardContent>
            <InputGroup start={<Search />} className="docs-pratinjau-cari">
              <Input placeholder="Cari nama atau NIM" aria-label="Cari mahasiswa" />
            </InputGroup>
            <TableContainer>
              <Table>
                <thead>
                  <tr>
                    <th>Mahasiswa</th>
                    <th>Program studi</th>
                    <th>IPK</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {MHS.map((m) => (
                    <tr key={m.nim}>
                      <td>
                        <CellPrimary media={<Avatar name={m.nama} size="sm" />} title={m.nama} subtitle={m.nim} />
                      </td>
                      <td>{m.prodi}</td>
                      <td>{m.ipk.toFixed(2)}</td>
                      <td>
                        <Badge variant={NADA[m.status]} dot>
                          {m.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        <div className="docs-pratinjau-kolom">
          <Card>
            <CardHeader title="Pengisian KRS" description="Batas akhir 20 September" />
            <CardContent>
              <Progress value={72} label="Sudah mengisi" />
              <BarChart
                height={120}
                data={[
                  { label: 'Sen', value: 120 },
                  { label: 'Sel', value: 210 },
                  { label: 'Rab', value: 180 },
                  { label: 'Kam', value: 260 },
                  { label: 'Jum', value: 310 },
                ]}
                highlightLast
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader title="Pengaturan kelas" />
            <CardContent className="docs-pratinjau-form">
              <Field label="Nama kelas">
                <Input defaultValue="Basis Data A" />
              </Field>
              <Field label="Ruang">
                <Select
                  defaultValue="lab1"
                  options={[
                    { value: 'lab1', label: 'Lab Komputer 1' },
                    { value: 'r201', label: 'Ruang 201' },
                  ]}
                />
              </Field>
              <SegmentedControl
                fullWidth
                defaultValue="luring"
                options={[
                  { value: 'luring', label: 'Luring' },
                  { value: 'daring', label: 'Daring' },
                  { value: 'campuran', label: 'Campuran' },
                ]}
              />
              <label className="docs-pratinjau-baris">
                <Switch defaultChecked /> Presensi otomatis
              </label>
              <label className="docs-pratinjau-baris">
                <Checkbox defaultChecked /> Kirim pengingat ke mahasiswa
              </label>
              <div className="docs-pratinjau-aksi">
                <Button variant="ghost">Batal</Button>
                <Button variant="secondary">Simpan draf</Button>
                <Button>Simpan</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="docs-pratinjau-alert">
        <Alert variant="success" title="Nilai berhasil dikirim">
          Nilai 38 mahasiswa kelas Basis Data A sudah masuk ke SIAKAD.
        </Alert>
        <Alert variant="warning" title="12 mahasiswa belum membayar UKT">
          Mereka tidak bisa mengisi KRS sampai pembayaran dikonfirmasi.
        </Alert>
        <Alert variant="danger" title="Sinkronisasi PDDikti gagal">
          Koneksi ke Neo Feeder terputus. Coba lagi dalam beberapa menit.
        </Alert>
      </div>
    </div>
  );
}
