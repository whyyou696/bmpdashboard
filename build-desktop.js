const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

const BUILD_DIR = path.join(__dirname, 'desktop-build');
const NODE_EXE_URL = 'https://nodejs.org/dist/v20.11.0/win-x64/node.exe';

function log(msg) {
  console.log(`[BUILD-DESKTOP] ${msg}`);
}

async function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    log(`Downloading portable node.exe from ${url}...`);
    https.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to download: Status Code ${response.statusCode}`));
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        log('Download complete.');
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function copyFolderRecursiveSync(source, target) {
  let files = [];

  // Check if folder needs to be created or clean
  const targetFolder = path.join(target, path.basename(source));
  if (!fs.existsSync(targetFolder)) {
    fs.mkdirSync(targetFolder, { recursive: true });
  }

  // Copy
  if (fs.lstatSync(source).isDirectory()) {
    files = fs.readdirSync(source);
    files.forEach((file) => {
      const curSource = path.join(source, file);
      if (fs.lstatSync(curSource).isDirectory()) {
        copyFolderRecursiveSync(curSource, targetFolder);
      } else {
        fs.copyFileSync(curSource, path.join(targetFolder, file));
      }
    });
  }
}

async function main() {
  try {
    // 1. Run Next.js Production Build
    log('Running Next.js production build (output: standalone)...');
    execSync('npm run build', { stdio: 'inherit' });

    // 2. Prepare build directory
    log(`Preparing directory: ${BUILD_DIR}`);
    if (fs.existsSync(BUILD_DIR)) {
      fs.rmSync(BUILD_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(BUILD_DIR, { recursive: true });

    // 3. Copy standalone build files
    const standalonePath = path.join(__dirname, '.next', 'standalone');
    if (!fs.existsSync(standalonePath)) {
      throw new Error('Next.js standalone directory not found. Please check next.config.mjs.');
    }

    log('Copying standalone server files...');
    // Copy everything inside .next/standalone/ into desktop-build/
    fs.readdirSync(standalonePath).forEach(file => {
      const src = path.join(standalonePath, file);
      const dest = path.join(BUILD_DIR, file);
      if (fs.lstatSync(src).isDirectory()) {
        fs.cpSync(src, dest, { recursive: true });
      } else {
        fs.copyFileSync(src, dest);
      }
    });

    // 4. Copy static assets (Required for Next.js standalone mode)
    log('Copying static assets (public/ and .next/static/)...');
    const publicPath = path.join(__dirname, 'public');
    const staticPath = path.join(__dirname, '.next', 'static');

    if (fs.existsSync(publicPath)) {
      fs.cpSync(publicPath, path.join(BUILD_DIR, 'public'), { recursive: true });
    }

    const destStaticDir = path.join(BUILD_DIR, '.next', 'static');
    fs.mkdirSync(destStaticDir, { recursive: true });
    if (fs.existsSync(staticPath)) {
      fs.cpSync(staticPath, destStaticDir, { recursive: true });
    }

    // 5. Download portable node.exe
    const destNodeExe = path.join(BUILD_DIR, 'node.exe');
    await downloadFile(NODE_EXE_URL, destNodeExe);

    // 6. Create start-app.bat
    log('Creating start-app.bat...');
    const batContent = `@echo off
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
`;
    fs.writeFileSync(path.join(BUILD_DIR, 'start-app.bat'), batContent);

    // 7. Copy .env file to standalone directory (if exists)
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      log('Copying .env file to desktop-build...');
      fs.copyFileSync(envPath, path.join(BUILD_DIR, '.env'));
    }

    log('==================================================');
    log('DESKTOP BUILD COMPLETED SUCCESSFULLY!');
    log(`Folder "${BUILD_DIR}" siap dipaketkan.`);
    log('==================================================');

  } catch (err) {
    console.error('[BUILD-DESKTOP] Build failed:', err.message);
    process.exit(1);
  }
}

main();
