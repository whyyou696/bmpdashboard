# Panduan Update & Rebuild Executable (.exe) BMP Dashboard

Aplikasi ini dibungkus menjadi single-file executable (`bmpdashboard.exe`) yang dapat berjalan mandiri di komputer Windows target.

## Keunggulan Executable (`bmpdashboard.exe`)
1. **Mandiri (Single-File Standalone)**: Cukup salin 1 file `bmpdashboard.exe` ke PC/komputer lain. Tidak perlu install Node.js, Git, atau dependensi apa pun pada komputer target.
2. **Tanpa Terminal**: Berjalan langsung di latar belakang Windows tanpa membuka jendela hitam terminal/cmd.
3. **Otomatis Membuka Browser**: Saat di-klik ganda, peramban (Edge/Chrome/Firefox) langsung terbuka ke `http://localhost:3001`.
4. **Otomatis Membuat Shortcut**: Menghasilkan shortcut BMP Dashboard di Desktop dan Start Menu.
5. **System Tray Icon (Pojok Kanan Bawah Layar)**:
   - 🌐 **Buka Dashboard di Browser**: Membuka halaman dashboard (`http://localhost:3001`).
   - ⚙️ **Konfigurasi Database (.env)**: Membuka file `.env` di Notepad untuk mengubah Host/IP Database, port, atau password.
   - 🔄 **Muat Ulang (Restart Server)**: Memuat ulang server setelah mengubah `.env`.
   - 📋 **Lihat Log Server**: Menampilkan log aktivitas server.
   - 📁 **Buka Folder Data Aplikasi**: Membuka direktori `%LocalAppData%\BMPDashboard`.
   - ❌ **Keluar (Exit)**: Menutup dan mematikan seluruh proses latar belakang secara bersih.

## Cara Menjalankan di Komputer Lain
1. Copy file `bmpdashboard.exe` ke komputer tujuan.
2. Klik ganda (Double-Click) `bmpdashboard.exe`.
3. Aplikasi otomatis berjalan dan membuka browser ke `http://localhost:3001`.

## Cara Rebuild di Masa Depan
Jika ada perubahan source code di masa mendatang dan ingin memperbarui `bmpdashboard.exe`, cukup jalankan:

```bash
npm run build:exe
```
