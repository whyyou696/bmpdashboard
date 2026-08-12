const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const archiver = require('zlib'); // for fallback or simple zip

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_BUILD = path.join(ROOT_DIR, 'dist_build');
const PAYLOAD_DIR = path.join(DIST_BUILD, 'payload');
const OUTPUT_ZIP = path.join(DIST_BUILD, 'app_payload.zip');
const OUTPUT_EXE = path.join(ROOT_DIR, 'bmpdashboard.exe');
const CSC_COMPILER = 'C:\\Windows\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe';

console.log('====================================================');
console.log('🚀 BMP Dashboard Single-Executable (.exe) Builder');
console.log('====================================================\n');

// 1. Check C# Compiler
if (!fs.existsSync(CSC_COMPILER)) {
  console.error(`❌ C# Compiler tidak ditemukan di: ${CSC_COMPILER}`);
  process.exit(1);
}

// 2. Locate node.exe
let nodeExePath = process.execPath;
if (!fs.existsSync(nodeExePath)) {
  nodeExePath = 'C:\\Program Files\\nodejs\\node.exe';
}
if (!fs.existsSync(nodeExePath)) {
  console.error(`❌ node.exe tidak ditemukan di: ${nodeExePath}`);
  process.exit(1);
}
console.log(`✓ Node.js runtime ditemukan: ${nodeExePath}`);

// 3. Helper to recursively copy directories
function copyRecursiveSync(src, dest) {
  const exists = fs.existsSync(src);
  const stats = exists && fs.statSync(src);
  const isDirectory = exists && stats.isDirectory();
  if (isDirectory) {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach((childItemName) => {
      copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
    });
  } else if (exists) {
    const parent = path.dirname(dest);
    if (!fs.existsSync(parent)) fs.mkdirSync(parent, { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

// 4. Build Next.js project
console.log('\n📦 1. Memeriksa build Next.js standalone...');
const standaloneServerJs = path.join(ROOT_DIR, '.next', 'standalone', 'server.js');
if (!fs.existsSync(standaloneServerJs)) {
  console.log('⚡ Menjalankan `next build` untuk menghasilkan standalone build...');
  execSync('cmd /c "npm run build"', { cwd: ROOT_DIR, stdio: 'inherit' });
} else {
  console.log('✓ Next.js standalone build sudah tersedia.');
}

// 5. Clean & create dist_build/payload
console.log('\n📁 2. Menyiapkan paket aplikasi di dist_build/payload...');
if (fs.existsSync(DIST_BUILD)) {
  fs.rmSync(DIST_BUILD, { recursive: true, force: true });
}
fs.mkdirSync(PAYLOAD_DIR, { recursive: true });

const targetServerDir = path.join(PAYLOAD_DIR, 'server');
const targetRuntimeDir = path.join(PAYLOAD_DIR, 'runtime');
fs.mkdirSync(targetServerDir, { recursive: true });
fs.mkdirSync(targetRuntimeDir, { recursive: true });

// Copy standalone Next.js server
console.log('  → Menyalin standalone server files...');
copyRecursiveSync(path.join(ROOT_DIR, '.next', 'standalone'), targetServerDir);

// Copy .next/static into server/.next/static
console.log('  → Menyalin .next/static assets...');
copyRecursiveSync(path.join(ROOT_DIR, '.next', 'static'), path.join(targetServerDir, '.next', 'static'));

// Copy public into server/public
console.log('  → Menyalin public directory...');
copyRecursiveSync(path.join(ROOT_DIR, 'public'), path.join(targetServerDir, 'public'));

// Copy .env if exists
const envFile = path.join(ROOT_DIR, '.env');
if (fs.existsSync(envFile)) {
  console.log('  → Menyalin konfigurasi .env default...');
  fs.copyFileSync(envFile, path.join(PAYLOAD_DIR, '.env'));
  fs.copyFileSync(envFile, path.join(targetServerDir, '.env'));
}

// Copy node.exe into runtime
console.log('  → Menyalin portable node.exe runtime...');
fs.copyFileSync(nodeExePath, path.join(targetRuntimeDir, 'node.exe'));

// Copy additional essential packages (mssql, tedious, tarn) to ensure full DB connectivity
const extraPackages = ['mssql', 'tedious', 'tarn'];
extraPackages.forEach((pkg) => {
  const pkgSrc = path.join(ROOT_DIR, 'node_modules', pkg);
  const pkgDest = path.join(targetServerDir, 'node_modules', pkg);
  if (fs.existsSync(pkgSrc) && !fs.existsSync(pkgDest)) {
    console.log(`  → Menyalin modul database ${pkg}...`);
    copyRecursiveSync(pkgSrc, pkgDest);
  }
});

// 6. Zip payload directory using PowerShell Compress-Archive or custom script
console.log('\n🗜️ 3. Mengompres seluruh aplikasi menjadi zip resource...');
if (fs.existsSync(OUTPUT_ZIP)) fs.unlinkSync(OUTPUT_ZIP);

try {
  // Use PowerShell Compress-Archive for fast native Windows zip
  const zipCmd = `powershell -NoProfile -Command "Compress-Archive -Path '${PAYLOAD_DIR}\\*' -DestinationPath '${OUTPUT_ZIP}' -CompressionLevel Optimal -Force"`;
  execSync(zipCmd, { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (zipErr) {
  console.error('Error saat kompresi zip:', zipErr.message);
  process.exit(1);
}

const zipStat = fs.statSync(OUTPUT_ZIP);
console.log(`✓ Zip Payload berhasil dibuat: ${(zipStat.size / (1024 * 1024)).toFixed(2)} MB`);

// 7. Locate icon
const iconFile = path.join(ROOT_DIR, 'public', 'assets', 'favicon.ico');
const hasIcon = fs.existsSync(iconFile);

// 8. Compile C# Launcher with CSC into bmpdashboard.exe
console.log('\n⚙️ 4. Mengompilasi C# Launcher ke Native Windows Executable (bmpdashboard.exe)...');
const launcherSource = path.join(ROOT_DIR, 'scripts', 'launcher', 'Program.cs');

let cscArgs = [
  '/target:winexe',
  '/platform:x64',
  '/optimize+',
  `/resource:"${OUTPUT_ZIP}",AppPayload`,
  '/r:System.dll',
  '/r:System.Windows.Forms.dll',
  '/r:System.Drawing.dll',
  '/r:System.IO.Compression.dll',
  '/r:System.IO.Compression.FileSystem.dll',
  '/r:System.Core.dll',
  `/out:"${OUTPUT_EXE}"`,
  `"${launcherSource}"`
];

if (hasIcon) {
  cscArgs.splice(3, 0, `/win32icon:"${iconFile}"`);
}

const cscCmd = `"${CSC_COMPILER}" ${cscArgs.join(' ')}`;
console.log(`  → Menjalankan C# Compiler...`);
try {
  execSync(cscCmd, { cwd: ROOT_DIR, stdio: 'inherit' });
} catch (cscErr) {
  console.error('❌ Gagal mengompilasi launcher:', cscErr.message);
  process.exit(1);
}

if (!fs.existsSync(OUTPUT_EXE)) {
  console.error('❌ File output bmpdashboard.exe tidak ditemukan!');
  process.exit(1);
}

const exeStat = fs.statSync(OUTPUT_EXE);
console.log('\n====================================================');
console.log('🎉 BERHASIL MEMBUAT INSTALLER / STANDALONE EXECUTABLE!');
console.log('====================================================');
console.log(`📁 Lokasi file : ${OUTPUT_EXE}`);
console.log(`⚖️ Ukuran file : ${(exeStat.size / (1024 * 1024)).toFixed(2)} MB`);
console.log('\n✨ Keunggulan bmpdashboard.exe:');
console.log('  1. Mandiri (Single File Executable) - Langsung jalan di PC/laptop lain.');
console.log('  2. Tanpa Terminal - Tidak ada popup layar hitam cmd/powershell.');
console.log('  3. Tanpa Install Node.js - Runtime Node.js & Next.js sudah tertanam di dalam .exe.');
console.log('  4. Otomatis Buka Browser - Langsung membuka http://localhost:3000 saat dijalankan.');
console.log('  5. Menu System Tray di Pojok Bawah - Bisa Buka Browser, Edit .env, Restart, & Keluar.');
console.log('  6. Otomatis Buat Shortcut di Desktop.');
console.log('====================================================\n');
