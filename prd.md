# 📋 Product Requirements Document (PRD)

## MONDAT — Monitoring Data Karantina

**Aplikasi Web Visualisasi & Monitoring Data**
**Balai Karantina Hewan, Ikan dan Tumbuhan Sulawesi Utara**

---

| Field              | Detail                                                        |
| ------------------ | ------------------------------------------------------------- |
| **Nama Produk**    | MONDAT (Monitoring Data)                                      |
| **Versi Dokumen**  | 1.0                                                           |
| **Tanggal**        | 21 Agustus 2026                                               |
| **Status**         | Draft — Menunggu Persetujuan                                  |
| **Target Platform**| Web Application (Desktop & Tablet Responsive)                 |

---

## 1. Ringkasan Eksekutif

MONDAT adalah aplikasi web dashboard untuk visualisasi dan monitoring data operasional Balai Karantina Hewan, Ikan dan Tumbuhan Sulawesi Utara. Aplikasi ini berfungsi sebagai platform terpusat untuk mengolah rekapitulasi data pengajuan sertifikat karantina dari pengguna jasa, yang mencakup komoditas hewan, ikan, dan tumbuhan dengan berbagai arah lalu lintas (domestik masuk/keluar, ekspor, dan impor).

Konsepnya menyerupai Microsoft Power BI atau Pivot Table Excel dalam versi yang lebih sederhana, modern, dan disesuaikan khusus untuk kebutuhan instansi. Data bulanan yang berjumlah ribuan baris per file Excel dapat divisualisasikan secara dinamis melalui grafik dan tabel interaktif yang sepenuhnya dapat dikustomisasi oleh pengguna.

---

## 2. Latar Belakang & Permasalahan

### 2.1 Kondisi Saat Ini
- Data rekapitulasi disimpan dalam file Excel terpisah per kategori dan per bulan.
- Terdapat **12 kategori data** yang perlu dikelola setiap bulannya.
- Volume data per file bisa mencapai **ribuan baris** dengan **kolom yang sangat banyak**.
- Analisis dan pelaporan dilakukan secara manual menggunakan Excel.
- Pimpinan sulit mendapatkan gambaran umum (*big picture*) secara cepat dan akurat.

### 2.2 Permasalahan yang Ingin Diselesaikan
- Tidak ada dashboard terpusat untuk melihat ringkasan data operasional.
- Proses analisis data manual memakan waktu dan rentan kesalahan.
- Sulitnya membandingkan tren data antar periode dan antar kategori.
- Keterbatasan dalam membuat visualisasi yang fleksibel dan interaktif.

---

## 3. Tujuan Produk

1. **Sentralisasi Data**: Menyatukan 12 kategori data rekapitulasi ke dalam satu platform terpusat.
2. **Visualisasi Dinamis**: Menyediakan grafik dan tabel interaktif yang dapat dikustomisasi secara bebas oleh pengguna (pilih kolom, pilih tipe grafik, pilih agregasi).
3. **Efisiensi Pelaporan**: Mempercepat proses pelaporan dengan fitur ekspor halaman dashboard ke PDF dan gambar.
4. **Aksesibilitas**: Aplikasi dapat diakses secara online melalui browser dengan domain khusus.
5. **Keamanan Data**: Membatasi akses berdasarkan peran pengguna (Role-Based Access).

---

## 4. Kategori Data Master (12 Dataset)

Data master terbagi berdasarkan **Arah Lalu Lintas** dan **Jenis Komoditas**:

| No | Kategori               | Arah Lalu Lintas | Jenis Komoditas |
|----|------------------------|-------------------|-----------------|
| 1  | Domestik Masuk Hewan   | Domestik Masuk    | Hewan           |
| 2  | Domestik Masuk Ikan    | Domestik Masuk    | Ikan            |
| 3  | Domestik Masuk Tumbuhan| Domestik Masuk    | Tumbuhan        |
| 4  | Domestik Keluar Hewan  | Domestik Keluar   | Hewan           |
| 5  | Domestik Keluar Ikan   | Domestik Keluar   | Ikan            |
| 6  | Domestik Keluar Tumbuhan| Domestik Keluar  | Tumbuhan        |
| 7  | Ekspor Hewan           | Ekspor            | Hewan           |
| 8  | Ekspor Ikan            | Ekspor            | Ikan            |
| 9  | Ekspor Tumbuhan        | Ekspor            | Tumbuhan        |
| 10 | Impor Hewan            | Impor             | Hewan           |
| 11 | Impor Ikan             | Impor             | Ikan            |
| 12 | Impor Tumbuhan         | Impor             | Tumbuhan        |

### 4.1 Karakteristik Struktur Kolom
- Ke-12 file pada umumnya memiliki **struktur kolom utama yang sama** (misal: Tanggal, Nomor Sertifikat, Pengguna Jasa, Volume, Satuan, Asal, Tujuan, dll.).
- Beberapa file memiliki **kolom tambahan/khusus** yang tidak ada di file lain.
- Perubahan struktur kolom **jarang terjadi** (~5 kali dalam kurun 2 tahun).
- Setiap file memiliki kolom tanggal yang lengkap di dalamnya.

---

## 5. Pengguna & Hak Akses (Role-Based Access)

### 5.1 Peran Pengguna

| Peran       | Deskripsi                                    | Hak Akses                                                                 |
|-------------|----------------------------------------------|---------------------------------------------------------------------------|
| **Admin**   | Pengelola utama aplikasi                     | Akses penuh: upload data, edit pengaturan, kelola pengguna, kustomisasi visualisasi, lihat semua dashboard, ekspor laporan |
| **Petugas** | Staf yang memantau data                      | Akses terbatas: lihat dashboard & visualisasi, ekspor laporan. **Tidak dapat** upload data, edit pengaturan, atau kelola pengguna |

### 5.2 Autentikasi
- Halaman **Login** sebagai gerbang utama aplikasi (wajib login untuk mengakses semua fitur).
- Autentikasi menggunakan **Supabase Auth** (email & password).
- Manajemen pengguna (tambah/hapus akun, ubah peran) dilakukan oleh Admin melalui menu Pengaturan.

---

## 6. Arsitektur & Tech Stack

### 6.1 Tech Stack

| Layer             | Teknologi                        | Keterangan                                          |
|-------------------|----------------------------------|-----------------------------------------------------|
| **Frontend**      | Next.js (React)                  | Framework utama untuk UI interaktif & routing       |
| **Styling**       | CSS Modern (Vanilla CSS)         | Desain premium dengan dark mode, warna solid, clean layout |
| **Charting**      | ECharts / Recharts               | Library grafik interaktif dengan animasi halus      |
| **Excel Parser**  | SheetJS (xlsx)                   | Parsing file .xlsx dan .csv di sisi klien           |
| **Export Engine** | html2canvas + jsPDF              | Ekspor halaman dashboard ke PNG/JPEG dan PDF        |
| **Backend & DB**  | Supabase (Free Tier)             | PostgreSQL + Auth + Storage + Row Level Security    |
| **Deployment**    | Vercel / Netlify                 | Hosting frontend dengan domain kustom               |

### 6.2 Kapasitas & Performa (Estimasi Supabase Free Tier)

| Metrik                    | Estimasi                                      |
|---------------------------|-----------------------------------------------|
| Data per bulan            | ~60.000 baris (12 file × ~5.000 baris)        |
| Data per tahun            | ~720.000 baris                                |
| Penggunaan storage DB     | ~50–80 MB per tahun                           |
| Kapasitas Supabase Free   | 500 MB database                               |
| Proyeksi durasi           | **5–7 tahun** data tanpa upgrade              |

### 6.3 Strategi Penyimpanan Kolom Dinamis (Dynamic Columns)

Karena ke-12 file memiliki kolom utama yang sama namun ada kolom khusus yang berbeda:

- **Kolom Utama (Fixed Columns)**: Disimpan sebagai kolom standar PostgreSQL (terindeks, cepat untuk query & filtering).
- **Kolom Khusus (Dynamic Columns)**: Disimpan dalam format **JSONB** pada satu kolom fleksibel. Hal ini memungkinkan:
  - Menyimpan kolom tambahan tanpa mengubah skema tabel.
  - Membuat visualisasi kustom dari kolom khusus maupun kolom utama.
  - Menangani perubahan struktur kolom Excel di masa depan tanpa merusak data lama.

---

## 7. Struktur Navigasi & Tata Letak UI

### 7.1 Layout Utama

```
┌─────────────────────────────────────────────────────────┐
│                     HEADER BAR                          │
│  [Logo MONDAT]  [Global Period Filter]  [User Profile]  │
├──────────┬──────────────────────────────────────────────┤
│          │                                              │
│ SIDEBAR  │              KONTEN HALAMAN                  │
│          │                                              │
│ ☐ Home   │   ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│          │   │ KPI Card │ │ KPI Card │ │ KPI Card │   │
│ ☐ Lalu   │   └──────────┘ └──────────┘ └──────────┘   │
│   Lintas │                                              │
│  ├ DM    │   ┌─────────────────┐ ┌─────────────────┐   │
│  ├ DK    │   │                 │ │                 │   │
│  ├ Ekspor│   │   Chart Area    │ │   Chart Area    │   │
│  └ Impor │   │                 │ │                 │   │
│          │   └─────────────────┘ └─────────────────┘   │
│ ☐ Karan- │                                              │
│   tina   │   ┌─────────────────────────────────────┐   │
│  ├ Hewan │   │          Data Table Area             │   │
│  ├ Ikan  │   │                                     │   │
│  └ Tumbu-│   └─────────────────────────────────────┘   │
│    han   │                                              │
│          │                                              │
│ ☐ Penga- │                                              │
│   turan  │                                              │
│          │                                              │
└──────────┴──────────────────────────────────────────────┘
```

### 7.2 Detail Halaman

#### 7.2.1 🏠 Home (Executive Dashboard)

**Tujuan**: Memberikan gambaran umum (*big picture*) kepada Pimpinan mengenai keseluruhan data operasional instansi.

**Konten**:
- **KPI Summary Cards**: Total sertifikat diterbitkan, total volume lalu lintas, perbandingan bulan ini vs bulan lalu, dll.
- **Visualisasi Gabungan**: Grafik-grafik yang menampilkan data teragregasi dari seluruh 12 kategori data master.
- **Kustomisasi**: Visualisasi yang ditampilkan di halaman ini **dapat dikustomisasi** (tambah/hapus/ubah grafik) melalui menu Pengaturan.
- **Global Period Filter**: Filter periode di header akan mempengaruhi seluruh data yang ditampilkan.

#### 7.2.2 🚚 Lalu Lintas (4 Sub-Menu)

Masing-masing sub-menu menampilkan visualisasi berdasarkan **arah lalu lintas**, menggabungkan data 3 jenis komoditas (Hewan, Ikan, Tumbuhan) dalam satu tampilan.

| Sub-Menu         | Data yang Ditampilkan                                    |
|------------------|----------------------------------------------------------|
| Domestik Masuk   | Gabungan: DM Hewan + DM Ikan + DM Tumbuhan              |
| Domestik Keluar  | Gabungan: DK Hewan + DK Ikan + DK Tumbuhan              |
| Ekspor           | Gabungan: Ekspor Hewan + Ekspor Ikan + Ekspor Tumbuhan   |
| Impor            | Gabungan: Impor Hewan + Impor Ikan + Impor Tumbuhan      |

**Fitur di Setiap Sub-Menu**:
- Visualisasi kustom (grafik & tabel) yang dapat dikonfigurasi.
- Filter berdasarkan jenis komoditas untuk membandingkan data.
- Tombol **Ekspor Halaman** ke PDF / Image.

#### 7.2.3 🌿 Karantina (3 Sub-Menu)

Masing-masing sub-menu menampilkan visualisasi berdasarkan **jenis komoditas**, menggabungkan data semua arah lalu lintas.

| Sub-Menu   | Data yang Ditampilkan                                           |
|------------|-----------------------------------------------------------------|
| Hewan      | Gabungan: DM Hewan + DK Hewan + Ekspor Hewan + Impor Hewan     |
| Ikan       | Gabungan: DM Ikan + DK Ikan + Ekspor Ikan + Impor Ikan          |
| Tumbuhan   | Gabungan: DM Tumbuhan + DK Tumbuhan + Ekspor Tumbuhan + Impor Tumbuhan |

**Fitur di Setiap Sub-Menu**:
- Visualisasi kustom (grafik & tabel) yang dapat dikonfigurasi.
- Filter berdasarkan arah lalu lintas untuk membandingkan data.
- Tombol **Ekspor Halaman** ke PDF / Image.

#### 7.2.4 ⚙️ Pengaturan

Pusat kendali untuk seluruh konfigurasi aplikasi. **Hanya dapat diakses oleh Admin.**

**Sub-Bagian**:

| Sub-Bagian                | Deskripsi                                                                  |
|---------------------------|----------------------------------------------------------------------------|
| **Manajemen Data**        | Upload file Excel per kategori & periode, lihat riwayat upload, hapus/replace data batch |
| **Kustomisasi Dashboard** | Atur visualisasi yang tampil di halaman Home, Lalu Lintas, dan Karantina   |
| **Column Mapping**        | Pengaturan pemetaan kolom untuk mencocokkan kolom umum & kolom khusus      |
| **Manajemen Pengguna**    | Tambah/hapus akun pengguna, ubah peran (Admin/Petugas)                     |
| **Profil & Keamanan**     | Ubah password, pengaturan akun                                             |

---

## 8. Fitur Detail

### 8.1 Sistem Upload & Manajemen Data

#### 8.1.1 Alur Upload Data

```
┌─────────────┐    ┌──────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ 1. Pilih    │───▶│ 2. Pilih Periode │───▶│ 3. Drag & Drop   │───▶│ 4. Preview &    │
│ Kategori    │    │ (Manual)         │    │ File Excel       │    │ Validasi Data   │
│ Data        │    │                  │    │                  │    │                 │
│ (dropdown)  │    │ Contoh:          │    │ .xlsx / .csv     │    │ - Jumlah baris  │
│             │    │ Agustus 2026     │    │                  │    │ - Jumlah kolom  │
└─────────────┘    └──────────────────┘    └──────────────────┘    │ - Deteksi error │
                                                                    └────────┬────────┘
                                                                             │
                                                    ┌────────────────────────▼───────┐
                                                    │ 5. Konfirmasi & Simpan         │
                                                    │                                │
                                                    │ Jika data periode sudah ada:   │
                                                    │ "Data Agustus 2026 sudah ada.  │
                                                    │  Replace data lama?"           │
                                                    │                                │
                                                    │ [Ya, Replace]  [Batal]         │
                                                    └────────────────────────────────┘
```

#### 8.1.2 Pemilihan Periode (Manual Selection)
- Pengguna memilih periode secara manual melalui dropdown bulan dan tahun **sebelum** mengunggah file.
- Format periode: `Bulan Tahun` (contoh: `Agustus 2026`).

#### 8.1.3 Preview & Validasi Data
Sebelum data disimpan ke database, sistem menampilkan ringkasan:
- Total baris data yang terdeteksi.
- Total kolom yang terdeteksi.
- Daftar nama kolom yang ditemukan.
- Peringatan jika ada data kosong pada kolom utama.
- Peringatan jika ada kolom baru yang belum pernah ada sebelumnya.

#### 8.1.4 Strategi Update Data
- Jika data untuk kategori dan periode yang sama **sudah ada** di database, sistem akan meminta konfirmasi untuk **replace (timpa)** data lama.
- Data lama akan **sepenuhnya digantikan** oleh data baru (bukan append/ditambahkan).

#### 8.1.5 Riwayat Upload & Rollback
- Admin dapat melihat daftar riwayat semua upload yang pernah dilakukan:
  - Nama file asli, kategori data, periode, jumlah baris, tanggal upload, dan pengguna yang mengunggah.
- Admin dapat **menghapus data per batch** (per kategori per periode) tanpa mengganggu data periode lain.

---

### 8.2 Sistem Visualisasi Kustom (Custom Chart Builder)

Fitur inti aplikasi yang memungkinkan pengguna membuat visualisasi data secara bebas dan fleksibel.

#### 8.2.1 Tipe Visualisasi yang Didukung

| Tipe Visualisasi    | Keterangan                                                   |
|---------------------|--------------------------------------------------------------|
| **Bar Chart**       | Perbandingan antar kategori (vertikal/horizontal)            |
| **Line Chart**      | Tren data dari waktu ke waktu                                |
| **Area Chart**      | Tren data dengan area terisi                                 |
| **Pie / Donut Chart** | Proporsi/komposisi data                                   |
| **KPI Summary Card** | Angka ringkasan tunggal (Total, Rata-rata, dsb.)           |
| **Data Table**      | Tabel interaktif dengan sorting, filtering, dan pagination   |

#### 8.2.2 Konfigurasi Visualisasi

Pengguna dapat mengkonfigurasi setiap visualisasi dengan memilih:

- **Sumber Data**: Kategori data mana yang digunakan (1 dari 12, atau gabungan).
- **Sumbu X / Kategori**: Kolom data yang dijadikan sumbu horizontal atau pengelompokan (misal: Bulan, Nama Cabang, Jenis Komoditas).
- **Sumbu Y / Nilai (Value)**: Kolom data yang dijadikan metrik perhitungan.
- **Jenis Agregasi**: `SUM`, `AVERAGE`, `COUNT`, `MIN`, `MAX`.
- **Tipe Grafik**: Pilih dari tipe visualisasi yang tersedia.
- **Judul & Label**: Kustomisasi judul grafik dan label sumbu.

#### 8.2.3 Dashboard Kustomisasi per Halaman

Setiap halaman (Home, Domestik Masuk, Domestik Keluar, Ekspor, Impor, Hewan, Ikan, Tumbuhan) memiliki konfigurasi visualisasi yang **tersimpan dan independen**.

- Admin dapat **menambah, mengedit, menghapus, dan mengatur urutan** visualisasi di setiap halaman melalui menu Pengaturan.
- Konfigurasi visualisasi disimpan di database sehingga berlaku untuk semua pengguna.
- Saat data baru diunggah, **semua visualisasi otomatis ter-update** tanpa perlu konfigurasi ulang.

---

### 8.3 Filter & Interaksi Data

#### 8.3.1 Global Period Filter (Header)
- Terletak di header, berlaku untuk **seluruh halaman** yang sedang aktif.
- Opsi filter: Bulan tertentu, Rentang Bulan, Triwulan, Semester, Tahun penuh, atau Custom Range.

#### 8.3.2 Filter Kontekstual per Halaman
- **Halaman Lalu Lintas**: Filter tambahan berdasarkan Jenis Komoditas (Hewan / Ikan / Tumbuhan).
- **Halaman Karantina**: Filter tambahan berdasarkan Arah Lalu Lintas (DM / DK / Ekspor / Impor).

---

### 8.4 Ekspor Laporan

#### 8.4.1 Ekspor Halaman Dashboard
- Tombol **"Ekspor Halaman"** tersedia di setiap halaman dashboard.
- Format ekspor: **PDF** (laporan multi-halaman) dan **Image** (PNG high-resolution).
- Hasil ekspor mencakup seluruh visualisasi (grafik, tabel, KPI cards) yang tampil di halaman tersebut pada saat tombol ditekan, termasuk filter yang sedang aktif.

---

### 8.5 Column Mapping (Pemetaan Kolom Dinamis)

Fitur untuk menangani perbedaan dan perubahan struktur kolom antar file Excel.

- **Auto-Detection**: Saat upload, sistem otomatis mendeteksi kolom-kolom yang ada di file Excel.
- **Mapping Interface**: Jika ada kolom baru yang belum pernah ada, sistem menampilkan antarmuka pemetaan:
  - *"Kolom 'Nama Cabang' belum terdaftar. Apakah ini kolom baru, atau sama dengan kolom 'Toko' yang sudah ada?"*
- **Kolom Registry**: Admin dapat mengelola daftar kolom yang dikenali oleh sistem, termasuk menandai kolom mana yang merupakan kolom utama (wajib ada) dan kolom khusus (opsional).

---

## 9. Halaman Login

### 9.1 Spesifikasi Halaman Login
- Halaman pertama yang dilihat pengguna saat mengakses aplikasi.
- Form login berisi: **Email** dan **Password**.
- Tombol **"Masuk"**.
- Desain modern dan premium dengan branding MONDAT dan identitas instansi.
- Setelah login berhasil, pengguna diarahkan ke halaman **Home (Executive Dashboard)**.
- Jika login gagal, tampilkan pesan error yang jelas.

---

## 10. Desain & User Experience

### 10.1 Prinsip Desain
- **Modern & Premium**: Tampilan yang bersih, profesional, dan memukau secara visual layaknya modern web apps terkini.
- **Dark Mode Theme**: Tema utama menggunakan dark mode dengan aksen warna yang harmonis.
- **Solid Color Palette**: Menggunakan palet warna solid yang konsisten dan profesional — tanpa efek glassmorphism. Warna-warna tegas, kontras yang jelas, dan hirarki visual yang kuat melalui penggunaan warna background bertingkat (surface levels).
- **Clean Card Design**: Cards dan panel menggunakan warna solid dengan subtle border atau shadow ringan untuk pemisahan visual, bukan efek blur/transparan.
- **Micro-Animations**: Transisi halus pada pergantian halaman, hover effects, dan loading states.
- **Typography Modern**: Menggunakan font modern seperti Inter atau Outfit dari Google Fonts.

### 10.2 Responsivitas
- Dioptimalkan untuk tampilan **Desktop** dan **Tablet**.
- Sidebar dapat di-collapse untuk memaksimalkan area konten.

---

## 11. Non-Functional Requirements

| Aspek          | Requirement                                                              |
|----------------|--------------------------------------------------------------------------|
| **Performa**   | Halaman dashboard harus ter-load dalam < 3 detik                        |
| **Keamanan**   | Row Level Security (RLS) di Supabase, autentikasi wajib untuk semua akses|
| **Ketersediaan**| Aplikasi online 24/7 dengan domain kustom                              |
| **Skalabilitas**| Mampu menampung data hingga 5+ tahun tanpa degradasi performa          |
| **Browser**    | Kompatibel dengan Chrome, Firefox, Edge, dan Safari versi terbaru        |

---

## 12. Batasan & Asumsi

### 12.1 Batasan (Scope Boundaries)
- Aplikasi ini **bukan** real-time data streaming; data dimasukkan secara manual per bulan melalui upload Excel.
- Tidak ada fitur notifikasi/alert otomatis pada versi awal.
- Tidak ada fitur komentar atau kolaborasi antar pengguna pada versi awal.
- Mobile phone layout bukan prioritas pada versi awal (fokus desktop & tablet).

### 12.2 Asumsi
- File Excel yang diunggah berformat `.xlsx` atau `.csv`.
- Pengguna memiliki akses internet untuk menggunakan aplikasi.
- Admin bertanggung jawab untuk mengunggah data dan mengatur visualisasi.
- Supabase Free Tier mencukupi untuk kebutuhan storage dan traffic aplikasi.

---

## 13. Milestone & Fase Pengembangan

### Fase 1 — Foundation (Core Infrastructure)
- Setup project Next.js + Supabase.
- Desain & implementasi database schema (tabel data, tabel konfigurasi, tabel pengguna).
- Halaman Login & sistem autentikasi (Supabase Auth).
- Role-Based Access (Admin & Petugas).
- Layout utama: Sidebar, Header, Content Area.

### Fase 2 — Data Management
- Modul Upload Excel (drag & drop, pemilihan kategori & periode).
- Parser Excel (SheetJS) dengan preview & validasi data.
- Sistem penyimpanan data ke Supabase PostgreSQL (fixed columns + JSONB dynamic columns).
- Riwayat upload & fitur rollback (hapus data per batch).
- Column Mapping interface.

### Fase 3 — Visualization Engine
- Custom Chart Builder (konfigurasi sumbu, agregasi, tipe grafik).
- Implementasi semua tipe visualisasi (Bar, Line, Area, Pie/Donut, KPI Card, Data Table).
- Dashboard layout per halaman (Home, 4× Lalu Lintas, 3× Karantina).
- Global Period Filter & filter kontekstual per halaman.

### Fase 4 — Dashboard Customization & Export
- Antarmuka kustomisasi dashboard di menu Pengaturan.
- Sistem penyimpanan konfigurasi visualisasi per halaman.
- Fitur Ekspor Halaman ke PDF & Image (html2canvas + jsPDF).

### Fase 5 — Polish & Deployment
- UI/UX polishing: animasi, transisi, responsive refinement.
- Testing menyeluruh (upload data, visualisasi, ekspor, role access).
- Deployment ke hosting (Vercel/Netlify) dengan domain kustom.
- Dokumentasi penggunaan aplikasi.

---

## 14. Risiko & Mitigasi

| Risiko                                     | Dampak  | Mitigasi                                                     |
|--------------------------------------------|---------|--------------------------------------------------------------|
| Supabase Free Tier mencapai batas          | Sedang  | Monitoring penggunaan; upgrade ke Pro jika diperlukan         |
| Perubahan struktur kolom Excel             | Rendah  | Sistem Column Mapping & JSONB dynamic columns                |
| File Excel corrupt / format tidak standar  | Rendah  | Validasi & preview sebelum simpan; pesan error yang jelas    |
| Performa lambat pada data sangat besar     | Rendah  | Indeks database; pagination; lazy loading chart              |

---

> **Status Dokumen**: Draft — Menunggu review dan persetujuan sebelum memulai implementasi.
