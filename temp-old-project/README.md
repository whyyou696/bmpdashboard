# BMP Dashboard - Transaction & Productivity Monitor

BMP Dashboard adalah platform pemantauan transaksi real-time premium yang dirancang khusus untuk memonitor data transaksi dari database server pulsa **OtomaX**. Memiliki visualisasi futuristik (glassmorphism), dukungan Mode Gelap (Dark Mode), dan fitur analitik interaktif.

---

## 🚀 Fitur Utama

- **Real-Time Transaction Stats**: Memantau Total Transaksi, Sukses (Rate %), Gagal (%), Canceled (%), Suspect (%), Tujuan Salah (%), dan Timeout.
- **Financial Summary**: Tracking pendapatan kotor (Retail Price), modal (Cost Price), dan laba bersih (Profit) secara instan.
- **Interactive Chart & Filters**: Visualisasi tren menggunakan *Chart.js*. Klik pada grafik otomatis memfilter data pada tabel di bawahnya.
- **Date Filtering**: Filter data secara fleksibel menggunakan opsi: *Hari Ini*, *Custom Tanggal*, dan *Semua Tanggal*.
- **Top Profitable Products**: Daftar produk terlaris dengan pagination pintar (10 produk per halaman jika data lebih dari 20).
- **Modul & Inbox Page**: Mengawasi produktivitas modul transaksi dan riwayat pesan masuk.
- **Responsive Layout**: Desain adaptif dari resolusi smartphone hingga desktop monitor lebar.

---

## 🛠️ Tech Stack (Teknologi yang Digunakan)

1. **Frontend**:
   - HTML5 & Vanilla CSS3 (Custom Variables, glassmorphism design tokens).
   - Vanilla JavaScript (Async API calls, dynamic UI binding, counter animation).
   - **Chart.js**: Library grafik interaktif untuk visualisasi tren transaksi.
   - **FontAwesome 6**: Set ikon premium.

2. **Backend**:
   - **Node.js** & **Express**: Web server & API routing provider.
   - **MSSQL Client (`mssql`)**: Driver untuk menghubungkan langsung ke database Microsoft SQL Server milik OtomaX.
   - **dotenv**: Pengelolaan konfigurasi environment secara aman.

---

## 📂 Struktur Folder Proyek

```text
dashboardbmp/
├── css/
│   └── style.css          # Semua styling visual, tema gelap/terang, & grid layout
├── js/
│   ├── app.js             # Logika utama halaman Dashboard (API fetch, filter, chart)
│   ├── analytics.js       # Logika visualisasi analitik & top produk
│   ├── inbox.js           # Logika halaman Inbox
│   ├── modul.js           # Logika modul produktivitas
│   ├── member.js          # Logika monitoring transaksi member
│   └── login.js           # Logika autentikasi login
├── assets/                # Logo, gambar, dan aset visual lainnya
├── index.html             # Halaman utama (Dashboard)
├── analytics.html         # Halaman Analitik
├── inbox.html             # Halaman Inbox
├── modul.html             # Halaman Modul
├── product.html           # Halaman Produk Terjual
├── member.html            # Halaman Member
├── login.html             # Halaman Login
├── server.js              # Node.js backend server (API & Routing)
└── .env                   # Pengaturan database (dibuat manual)
```

---

## 📋 Task yang Sudah Diselesaikan

Berikut adalah riwayat pengembangan dan perbaikan yang berhasil diimplementasikan:
1. **Penyaringan Semua Tanggal**: Ditambahkan opsi penyaringan "Semua Tanggal" pada filter tanggal di halaman Dashboard, Produk, Modul, dan Member (kecuali halaman Inbox).
2. **Chart Penjualan Produk**: Diubah menjadi grafik vertikal (sebelumnya horizontal) dan dibatasi maksimal 10 data per halaman dengan sistem *pagination* jika total produk yang terjual melebihi 20 data.
3. **Analitik Profit**: Mengganti grafik/card "Produk Gagal Terbanyak" dengan "Profit Produk Terlaris" agar lebih berorientasi pada metrik keuntungan bisnis.
4. **Organisasi Struktur Folder**: Memindahkan berkas-berkas `.js` ke dalam folder `/js` dan berkas `.css` ke `/css` agar struktur proyek menjadi rapi dan mudah dikelola.
5. **Card Tujuan Salah**: Menambahkan card KPI baru khusus untuk melacak total transaksi berstatus Tujuan Salah (status 52/54) beserta persentase kontribusinya.
6. **Perbaikan Layout Sempurna (No Empty Space)**: Mengubah sistem grid layout summary card menjadi 12 kolom, sehingga card baris kedua (Suspect, Tujuan Salah, Timeout) memanjang secara proporsional dan menutup ruang kosong di sebelah kanan dengan sempurna.

---

## 🔧 Cara Instalasi & Penggunaan

### 1. Prasyarat (Prerequisites)
Pastikan Anda sudah menginstal:
- [Node.js](https://nodejs.org/) (versi 16 atau lebih baru)
- Akses ke database Microsoft SQL Server (database OtomaX)

### 2. Pengaturan Variabel Environment (`.env`)
Buat berkas bernama `.env` di folder utama proyek (`dashboardbmp/`) dan isi dengan konfigurasi database SQL Server Anda:

```env
DB_USER=isi_username_db
DB_PASSWORD=isi_password_db
DB_HOST=localhost (atau IP server database)
DB_PORT=1433 (port SQL server default)
DB_NAME=isi_nama_database_otomax
PORT=3000
```

### 3. Instal Dependensi
Buka Terminal/Command Prompt di folder proyek, kemudian jalankan perintah berikut:
```bash
npm install
```

### 4. Menjalankan Dashboard
Jalankan web server dengan perintah:
```bash
node server.js
```
Setelah server berjalan, buka browser Anda dan akses alamat:
```text
http://localhost:3000
```
Login menggunakan kredensial yang ditentukan di aplikasi Anda (secara default disimpan di session storage untuk demonstrasi).
