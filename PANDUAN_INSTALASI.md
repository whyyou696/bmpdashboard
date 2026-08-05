# PANDUAN INSTALASI & PENGGUNAAN CRM DASHBOARD BMP

Panduan ini ditujukan bagi pengguna akhir (klien) untuk memasang dan menjalankan aplikasi CRM Dashboard secara lokal di komputer Windows.

---

## 📌 Persyaratan Sistem
- Sistem Operasi: Windows 10 atau Windows 11 (64-bit).
- Koneksi Internet / Jaringan VPN aktif.
- Aplikasi **OpenVPN Connect** sudah terinstal dan terhubung ke profil VPN yang disediakan.

---

## 🚀 Langkah 1: Hubungkan OpenVPN
Sebelum membuka Dashboard, pastikan komputer Anda sudah terhubung ke jaringan VPN:
1. Buka aplikasi **OpenVPN Connect** di komputer Anda.
2. Pilih profil koneksi VPN Anda (misalnya IP `103.139.244.187` atau `vpn.pulsabmp...`).
3. Klik tombol **Connect** dan pastikan statusnya berubah menjadi **"Connected"** (berwarna hijau).

---

## 📦 Langkah 2: Instalasi Aplikasi
1. Buka file installer **`CRM_Dashboard_Setup.exe`** yang telah diberikan kepada Anda.
2. Ikuti instruksi pada layar wizard instalasi:
   - Pilih bahasa (Indonesia atau Inggris).
   - Klik **Next** / **Lanjut** (aplikasi akan otomatis terpasang di folder lokal Anda).
   - Pastikan Anda mencentang opsi **"Buat shortcut di desktop"** (Create a desktop shortcut).
3. Klik **Install** / **Pasang** dan tunggu hingga proses selesai.
4. Klik **Finish** / **Selesai**.

---

## 🖥️ Langkah 3: Menjalankan Aplikasi
1. Di Desktop komputer Anda, cari dan dobel-klik ikon **CRM Dashboard BMP**.
2. Sebuah jendela Command Prompt (terminal hitam) berlabel **CRM Dashboard** akan terbuka secara otomatis.
   > ⚠️ **PENTING**: **JANGAN MENUTUP** jendela hitam ini. Jendela ini adalah server aplikasi yang menghubungkan tampilan dashboard ke database lokal. Jika jendela ini ditutup, dashboard tidak akan bisa menampilkan data.
3. Setelah jeda 2 detik, web browser bawaan komputer Anda (seperti Google Chrome atau Microsoft Edge) akan otomatis terbuka dan menampilkan halaman login/dashboard di alamat:
   `http://localhost:3000`
4. Anda sekarang dapat menggunakan CRM Dashboard secara lancar.

---

## 🛑 Langkah 4: Mematikan Aplikasi
Jika Anda sudah selesai menggunakan dashboard dan ingin mematikannya:
1. Cukup klik tombol silang (**X**) di kanan atas pada jendela Command Prompt (terminal hitam) bernama **CRM Dashboard**.
2. Server akan mati secara otomatis, dan aplikasi tidak lagi menggunakan resource komputer Anda.
