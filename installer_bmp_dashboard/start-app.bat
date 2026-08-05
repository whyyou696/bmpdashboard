@echo off
title CRM Dashboard
echo Starting CRM Dashboard Server...
echo ==================================================
echo Harap jangan tutup jendela ini selama menggunakan
echo CRM Dashboard.
echo.
echo Menutup jendela ini akan mematikan server.
echo ==================================================
echo.

:: Menjalankan pembukaan browser secara background setelah jeda 2 detik
start /b cmd /c "timeout /t 2 /nobreak > NUL && start http://localhost:3000"

:: Jalankan server Next.js di foreground
"node.exe" "server.js"
