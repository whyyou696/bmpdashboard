# 🚀 BMP Dashboard - Standalone Windows Application

BMP Dashboard adalah aplikasi dashboard transaksi & analitik berbasis Next.js dan MS SQL Database. Aplikasi ini telah dipaketkan menjadi file installer/executable tunggal (**`bmpdashboard.exe`**) sehingga dapat dijalankan di komputer atau PC Windows lain secara langsung tanpa perlu membuka terminal atau menginstal Node.js / Git.

---

## 🌟 Fitur Single-Executable `bmpdashboard.exe`

1. **Mandiri (Single Standalone Executable)**: Cukup salin satu file `bmpdashboard.exe` ke PC/laptop lain.
2. **Tanpa Terminal / Command Prompt**: Berjalan mulus di latar belakang tanpa jendela hitam cmd/powershell.
3. **Tanpa Instalasi Eksternal**: Node.js runtime, Next.js standalone server, dependensi database (mssql/tedious), dan aset statis sudah tertanam di dalam `.exe`.
4. **Otomatis Membuka Browser**: Saat pertama kali dijalankan, sistem otomatis membuka peramban bawaan (Edge/Chrome/Firefox) ke `http://localhost:3000`.
5. **System Tray Icon (Pojok Kanan Bawah Windows)**:
   - 🌐 **Buka Dashboard di Browser**: Membuka halaman dashboard di browser.
   - ⚙️ **Konfigurasi Database (.env)**: Membuka file `.env` di Notepad untuk mengubah host/IP server SQL atau kredensial database.
   - 🔄 **Restart Server**: Memuat ulang server setelah mengubah file `.env`.
   - 📋 **Lihat Log Server**: Menampilkan catatan aktivitas server untuk keperluan monitoring.
   - 📁 **Buka Folder Data Aplikasi**: Membuka direktori penyimpanan data lokal `%LocalAppData%\BMPDashboard`.
   - 📌 **Buat Shortcut di Desktop**: Membuat pintasan di Desktop & Start Menu.
   - ❌ **Keluar (Exit)**: Mematikan seluruh proses server dan keluar secara bersih.
6. **Pembersihan Bersih (Clean Process Cleanup)**: Menggunakan Windows Job Object sehingga saat aplikasi ditutup atau komputer dimatikan, semua proses di latar belakang otomatis berhenti tanpa meninggalkan proses sisa.

---

## 💻 Cara Menggunakan di PC Lain

1. Salin file **`bmpdashboard.exe`** ke PC/Laptop tujuan (bisa via flashdisk, network share, atau Google Drive/email).
2. **Klik ganda (Double-click)** pada file `bmpdashboard.exe`.
3. Aplikasi akan langsung berjalan di latar belakang dan browser akan otomatis terbuka di `http://localhost:3000`.
4. Pintasan (shortcut) **BMP Dashboard** juga otomatis dibuat di Desktop dan menu Start.

---

## ⚙️ Mengubah Konfigurasi Database di PC Lain

Jika server database SQL berada di IP atau port yang berbeda:
1. Klik kanan ikon **BMP Dashboard** di System Tray (pojok kanan bawah layar dekat jam).
2. Pilih **⚙️ Konfigurasi Database (.env)**.
3. Notepad akan terbuka menampilkan konfigurasi berikut:
   ```env
   DB_HOST=10.0.0.2
   DB_PORT=1433
   DB_USER=cs
   DB_PASSWORD=YourPasswordHere
   DB_NAME=otomax
   DB_BRIDGE_KEY=KunciRahasiaBmpDashboard123!
   PORT=3000
   ```
4. Simpan file (`Ctrl + S`), lalu klik kanan lagi ikon Tray dan pilih **🔄 Muat Ulang (Restart Server)**.

---

## 🛠️ Cara Rebuild / Membuat Ulang `bmpdashboard.exe`

Jika Anda melakukan perubahan kode aplikasi di masa mendatang dan ingin memperbarui `bmpdashboard.exe`, jalankan perintah berikut:

```bash
npm run build:exe
```

Perintah ini akan:
1. Menjalankan kompilasi `next build` standalone.
2. Memaketkan server, static assets, database drivers, dan runtime portable ke dalam arsip terkompresi.
3. Mengompilasi source code C# launcher dengan compiler Windows bawaan (`csc.exe`).
4. Menghasilkan file **`bmpdashboard.exe`** terbaru di root folder.

---

## 📂 Struktur Data Lokal di PC Pengguna

Aplikasi menyimpan runtime dan konfigurasi lokal di:
```
%LocalAppData%\BMPDashboard
├── server/          (Next.js standalone application files)
├── runtime/         (Portable Node.js executable)
├── logs/            (server.log & error.log)
├── .env             (Konfigurasi Database aktif)
└── version.txt      (Versi build)
```
