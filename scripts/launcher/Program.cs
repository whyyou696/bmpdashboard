using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.IO.Compression;
using System.Net;
using System.Net.Sockets;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace BMPDashboardLauncher
{
    static class Program
    {
        private static NotifyIcon trayIcon;
        private static ContextMenuStrip trayMenu;
        private static Process serverProcess;
        private static Mutex singleInstanceMutex;
        private static string appDataDir;
        private static string serverDir;
        private static string runtimeDir;
        private static string logsDir;
        private static string envPath;
        private static string serverLogPath;
        private static string errorLogPath;
        private static int serverPort = 3000;
        private static IntPtr jobObjectHandle = IntPtr.Zero;

        private const string MUTEX_NAME = "Global\\BMPDashboard_App_SingleInstance_Mutex_WhyYou696";

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            // Handle CLI arguments
            if (args != null && args.Length > 0)
            {
                string cmd = args[0].ToLowerInvariant().Trim('-', '/');
                if (cmd == "uninstall")
                {
                    UninstallApp();
                    return;
                }
            }

            // 1. Single Instance Check
            bool isFirstInstance;
            singleInstanceMutex = new Mutex(true, MUTEX_NAME, out isFirstInstance);
            if (!isFirstInstance)
            {
                // Already running -> open browser to existing port and exit
                int activePort = ReadPortFromConfig();
                OpenBrowser("http://localhost:" + activePort);
                return;
            }

            try
            {
                // 2. Initialize Directories in %LocalAppData%\BMPDashboard
                string localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
                appDataDir = Path.Combine(localAppData, "BMPDashboard");
                serverDir = Path.Combine(appDataDir, "server");
                runtimeDir = Path.Combine(appDataDir, "runtime");
                logsDir = Path.Combine(appDataDir, "logs");
                envPath = Path.Combine(appDataDir, ".env");
                serverLogPath = Path.Combine(logsDir, "server.log");
                errorLogPath = Path.Combine(logsDir, "error.log");

                Directory.CreateDirectory(appDataDir);
                Directory.CreateDirectory(logsDir);

                // 3. Extract Embedded App Payload if first run or update
                ExtractPayloadIfNeeded();

                // 4. Create Desktop & Start Menu Shortcuts
                CreateShortcuts();

                // 5. Setup Windows Job Object to guarantee child process cleanup on exit
                SetupJobObject();

                // 6. Read Port configuration
                serverPort = ReadPortFromConfig();

                // 7. Initialize System Tray Icon & Menu
                InitializeTray();

                // 8. Start Background Node Server
                StartServerProcess();

                // 9. Start background worker to wait for server HTTP ready and open browser
                ThreadPool.QueueUserWorkItem(delegate
                {
                    WaitForServerAndOpenBrowser();
                });

                // 10. Run Message Loop for System Tray
                Application.Run();
            }
            catch (Exception ex)
            {
                MessageBox.Show("Terjadi kesalahan saat memulai BMP Dashboard:\n\n" + ex.Message, "BMP Dashboard Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                CleanupAndExit();
            }
        }

        private static void ExtractPayloadIfNeeded()
        {
            string versionFile = Path.Combine(appDataDir, "version.txt");
            string currentAssemblyDate = GetAssemblyBuildDate();
            bool needExtract = true;

            if (File.Exists(versionFile) && Directory.Exists(serverDir) && Directory.Exists(runtimeDir))
            {
                try
                {
                    string installedVersion = File.ReadAllText(versionFile).Trim();
                    if (installedVersion == currentAssemblyDate)
                    {
                        needExtract = false;
                    }
                }
                catch { }
            }

            if (needExtract)
            {
                // Preserve existing .env if user previously customized it
                string backupEnv = null;
                if (File.Exists(envPath))
                {
                    try { backupEnv = File.ReadAllText(envPath); } catch { }
                }

                // Extract embedded zip payload
                Assembly asm = Assembly.GetExecutingAssembly();
                string[] resNames = asm.GetManifestResourceNames();
                string targetResource = null;
                foreach (string name in resNames)
                {
                    if (name.IndexOf("AppPayload", StringComparison.OrdinalIgnoreCase) >= 0 || name.EndsWith(".zip", StringComparison.OrdinalIgnoreCase))
                    {
                        targetResource = name;
                        break;
                    }
                }

                if (targetResource != null)
                {
                    using (Stream stream = asm.GetManifestResourceStream(targetResource))
                    {
                        if (stream != null)
                        {
                            using (ZipArchive archive = new ZipArchive(stream, ZipArchiveMode.Read))
                            {
                                foreach (ZipArchiveEntry entry in archive.Entries)
                                {
                                    string destPath = Path.Combine(appDataDir, entry.FullName.Replace('/', '\\'));
                                    if (string.IsNullOrEmpty(entry.Name))
                                    {
                                        Directory.CreateDirectory(destPath);
                                        continue;
                                    }

                                    string parentDir = Path.GetDirectoryName(destPath);
                                    if (!Directory.Exists(parentDir))
                                    {
                                        Directory.CreateDirectory(parentDir);
                                    }

                                    entry.ExtractToFile(destPath, true);
                                }
                            }
                        }
                    }
                }

                // Restore custom .env if it existed
                if (!string.IsNullOrEmpty(backupEnv))
                {
                    try { File.WriteAllText(envPath, backupEnv); } catch { }
                }

                try
                {
                    File.WriteAllText(versionFile, currentAssemblyDate);
                }
                catch { }
            }
        }

        private static string GetAssemblyBuildDate()
        {
            try
            {
                string loc = Assembly.GetExecutingAssembly().Location;
                if (File.Exists(loc))
                {
                    return new FileInfo(loc).LastWriteTimeUtc.Ticks.ToString();
                }
            }
            catch { }
            return DateTime.UtcNow.Ticks.ToString();
        }

        private static int ReadPortFromConfig()
        {
            int port = 3000;
            if (File.Exists(envPath))
            {
                try
                {
                    string[] lines = File.ReadAllLines(envPath);
                    foreach (string rawLine in lines)
                    {
                        string line = rawLine.Trim();
                        if (line.StartsWith("PORT=", StringComparison.OrdinalIgnoreCase))
                        {
                            string pStr = line.Substring(5).Trim();
                            int parsed;
                            if (int.TryParse(pStr, out parsed) && parsed > 0 && parsed < 65535)
                            {
                                port = parsed;
                            }
                        }
                    }
                }
                catch { }
            }
            return port;
        }

        private static void StartServerProcess()
        {
            StopServerProcess();

            string nodeExe = Path.Combine(runtimeDir, "node.exe");
            if (!File.Exists(nodeExe))
            {
                // Fallback to system node if embedded node is missing
                nodeExe = "node";
            }

            string serverJs = Path.Combine(serverDir, "server.js");
            if (!File.Exists(serverJs))
            {
                throw new FileNotFoundException("File server Next.js tidak ditemukan di: " + serverJs);
            }

            ProcessStartInfo psi = new ProcessStartInfo();
            psi.FileName = nodeExe;
            psi.Arguments = "\"" + serverJs + "\"";
            psi.WorkingDirectory = serverDir;
            psi.UseShellExecute = false;
            psi.CreateNoWindow = true;
            psi.WindowStyle = ProcessWindowStyle.Hidden;
            psi.RedirectStandardOutput = true;
            psi.RedirectStandardError = true;

            // Environment variables
            psi.EnvironmentVariables["PORT"] = serverPort.ToString();
            psi.EnvironmentVariables["HOSTNAME"] = "0.0.0.0";
            psi.EnvironmentVariables["NODE_ENV"] = "production";

            // Load .env variables into process environment
            if (File.Exists(envPath))
            {
                try
                {
                    string[] lines = File.ReadAllLines(envPath);
                    foreach (string rawLine in lines)
                    {
                        string line = rawLine.Trim();
                        if (string.IsNullOrEmpty(line) || line.StartsWith("#")) continue;
                        int eqIdx = line.IndexOf('=');
                        if (eqIdx > 0)
                        {
                            string key = line.Substring(0, eqIdx).Trim();
                            string val = line.Substring(eqIdx + 1).Trim();
                            psi.EnvironmentVariables[key] = val;
                        }
                    }
                }
                catch { }
            }

            serverProcess = new Process();
            serverProcess.StartInfo = psi;
            serverProcess.EnableRaisingEvents = true;

            // Log output in background
            serverProcess.OutputDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    LogToFile(serverLogPath, e.Data);
                }
            };
            serverProcess.ErrorDataReceived += delegate(object sender, DataReceivedEventArgs e)
            {
                if (!string.IsNullOrEmpty(e.Data))
                {
                    LogToFile(errorLogPath, e.Data);
                }
            };

            serverProcess.Start();
            serverProcess.BeginOutputReadLine();
            serverProcess.BeginErrorReadLine();

            // Bind to Windows Job Object so child process terminates if launcher is killed
            if (jobObjectHandle != IntPtr.Zero)
            {
                try
                {
                    AssignProcessToJobObject(jobObjectHandle, serverProcess.Handle);
                }
                catch { }
            }
        }

        private static void StopServerProcess()
        {
            if (serverProcess != null && !serverProcess.HasExited)
            {
                try
                {
                    serverProcess.Kill();
                    serverProcess.WaitForExit(2000);
                }
                catch { }
                finally
                {
                    serverProcess = null;
                }
            }
        }

        private static void WaitForServerAndOpenBrowser()
        {
            string url = "http://localhost:" + serverPort;
            bool ready = false;

            for (int i = 0; i < 60; i++) // Try for up to 30 seconds
            {
                Thread.Sleep(500);
                try
                {
                    HttpWebRequest request = (HttpWebRequest)WebRequest.Create(url);
                    request.Timeout = 1000;
                    request.Method = "HEAD";
                    using (HttpWebResponse response = (HttpWebResponse)request.GetResponse())
                    {
                        if (response.StatusCode == HttpStatusCode.OK || (int)response.StatusCode < 400)
                        {
                            ready = true;
                            break;
                        }
                    }
                }
                catch
                {
                    // Retry
                }
            }

            if (ready)
            {
                ShowNotification("BMP Dashboard Berjalan", "Server aktif di port " + serverPort + ". Membuka dashboard di browser...");
                OpenBrowser(url);
            }
            else
            {
                ShowNotification("BMP Dashboard Memulai", "Server sedang dimuat di latar belakang (Port " + serverPort + ").");
                OpenBrowser(url);
            }
        }

        private static void InitializeTray()
        {
            trayMenu = new ContextMenuStrip();

            ToolStripMenuItem itemTitle = new ToolStripMenuItem("BMP Dashboard (Port: " + serverPort + ")");
            itemTitle.Font = new Font(itemTitle.Font, FontStyle.Bold);
            itemTitle.Enabled = false;
            trayMenu.Items.Add(itemTitle);

            trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem itemOpen = new ToolStripMenuItem("🌐 Buka Dashboard di Browser", null, delegate {
                OpenBrowser("http://localhost:" + serverPort);
            });
            itemOpen.Font = new Font(itemOpen.Font, FontStyle.Bold);
            trayMenu.Items.Add(itemOpen);

            ToolStripMenuItem itemConfig = new ToolStripMenuItem("⚙️ Konfigurasi Database (.env)", null, delegate {
                if (File.Exists(envPath))
                {
                    Process.Start("notepad.exe", "\"" + envPath + "\"");
                }
                else
                {
                    MessageBox.Show("File konfigurasi .env belum dibuat.", "Info", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            });
            trayMenu.Items.Add(itemConfig);

            ToolStripMenuItem itemRestart = new ToolStripMenuItem("🔄 Muat Ulang (Restart Server)", null, delegate {
                try
                {
                    serverPort = ReadPortFromConfig();
                    StartServerProcess();
                    ShowNotification("Server Dimuat Ulang", "BMP Dashboard telah di-restart pada port " + serverPort);
                }
                catch (Exception ex)
                {
                    MessageBox.Show("Gagal me-restart server: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            });
            trayMenu.Items.Add(itemRestart);

            ToolStripMenuItem itemLogs = new ToolStripMenuItem("📋 Lihat Log Server", null, delegate {
                if (File.Exists(serverLogPath))
                {
                    Process.Start("notepad.exe", "\"" + serverLogPath + "\"");
                }
                else
                {
                    MessageBox.Show("Log server belum tersedia.", "Info", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            });
            trayMenu.Items.Add(itemLogs);

            ToolStripMenuItem itemFolder = new ToolStripMenuItem("📁 Buka Folder Data Aplikasi", null, delegate {
                Process.Start("explorer.exe", "\"" + appDataDir + "\"");
            });
            trayMenu.Items.Add(itemFolder);

            ToolStripMenuItem itemShortcut = new ToolStripMenuItem("📌 Buat Shortcut di Desktop", null, delegate {
                CreateShortcuts();
                ShowNotification("Shortcut Dibuat", "Shortcut BMP Dashboard telah diperbarui di Desktop dan Start Menu.");
            });
            trayMenu.Items.Add(itemShortcut);

            trayMenu.Items.Add(new ToolStripSeparator());

            ToolStripMenuItem itemExit = new ToolStripMenuItem("❌ Keluar (Exit)", null, delegate {
                CleanupAndExit();
            });
            trayMenu.Items.Add(itemExit);

            trayIcon = new NotifyIcon();
            trayIcon.Text = "BMP Dashboard (Port " + serverPort + ")";
            trayIcon.ContextMenuStrip = trayMenu;

            // Load Icon from Executing Assembly
            Icon appIcon = null;
            try
            {
                appIcon = Icon.ExtractAssociatedIcon(Assembly.GetExecutingAssembly().Location);
            }
            catch { }

            if (appIcon == null)
            {
                appIcon = SystemIcons.Application;
            }

            trayIcon.Icon = appIcon;
            trayIcon.Visible = true;

            trayIcon.DoubleClick += delegate {
                OpenBrowser("http://localhost:" + serverPort);
            };
        }

        private static void ShowNotification(string title, string message)
        {
            if (trayIcon != null)
            {
                try
                {
                    trayIcon.BalloonTipTitle = title;
                    trayIcon.BalloonTipText = message;
                    trayIcon.BalloonTipIcon = ToolTipIcon.Info;
                    trayIcon.ShowBalloonTip(3000);
                }
                catch { }
            }
        }

        private static void OpenBrowser(string url)
        {
            try
            {
                Process.Start(new ProcessStartInfo
                {
                    FileName = url,
                    UseShellExecute = true
                });
            }
            catch (Exception ex)
            {
                try
                {
                    Process.Start("cmd.exe", "/c start \"\" \"" + url + "\"");
                }
                catch
                {
                    MessageBox.Show("Gagal membuka browser otomatis. Silakan buka alamat manual: " + url + "\n\n" + ex.Message, "BMP Dashboard", MessageBoxButtons.OK, MessageBoxIcon.Information);
                }
            }
        }

        private static void CreateShortcuts()
        {
            try
            {
                string currentExe = Assembly.GetExecutingAssembly().Location;
                string desktopPath = Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory);
                string startMenuPath = Environment.GetFolderPath(Environment.SpecialFolder.StartMenu);
                string programsPath = Path.Combine(startMenuPath, "Programs");

                CreateWScriptShortcut(Path.Combine(desktopPath, "BMP Dashboard.lnk"), currentExe, "Aplikasi BMP Dashboard");
                if (Directory.Exists(programsPath))
                {
                    CreateWScriptShortcut(Path.Combine(programsPath, "BMP Dashboard.lnk"), currentExe, "Aplikasi BMP Dashboard");
                }
            }
            catch { }
        }

        private static void CreateWScriptShortcut(string shortcutPath, string targetPath, string description)
        {
            try
            {
                Type shellType = Type.GetTypeFromProgID("WScript.Shell");
                if (shellType != null)
                {
                    dynamic shell = Activator.CreateInstance(shellType);
                    dynamic shortcut = shell.CreateShortcut(shortcutPath);
                    shortcut.TargetPath = targetPath;
                    shortcut.WorkingDirectory = Path.GetDirectoryName(targetPath);
                    shortcut.Description = description;
                    shortcut.IconLocation = targetPath + ",0";
                    shortcut.Save();
                }
            }
            catch { }
        }

        private static void UninstallApp()
        {
            try
            {
                StopServerProcess();
                string desktopShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.DesktopDirectory), "BMP Dashboard.lnk");
                if (File.Exists(desktopShortcut)) File.Delete(desktopShortcut);

                string startShortcut = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.StartMenu), "Programs", "BMP Dashboard.lnk");
                if (File.Exists(startShortcut)) File.Delete(startShortcut);

                MessageBox.Show("Shortcut BMP Dashboard telah dihapus. Folder data tersimpan di:\n" + appDataDir, "BMP Dashboard", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                MessageBox.Show("Error saat uninstall: " + ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private static readonly object logLock = new object();
        private static void LogToFile(string path, string text)
        {
            lock (logLock)
            {
                try
                {
                    string time = DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss");
                    File.AppendAllText(path, "[" + time + "] " + text + Environment.NewLine);
                }
                catch { }
            }
        }

        private static void CleanupAndExit()
        {
            try
            {
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                    trayIcon = null;
                }
            }
            catch { }

            try
            {
                StopServerProcess();
            }
            catch { }

            if (jobObjectHandle != IntPtr.Zero)
            {
                try { CloseHandle(jobObjectHandle); } catch { }
                jobObjectHandle = IntPtr.Zero;
            }

            if (singleInstanceMutex != null)
            {
                try { singleInstanceMutex.ReleaseMutex(); } catch { }
                singleInstanceMutex.Dispose();
                singleInstanceMutex = null;
            }

            Application.Exit();
            Environment.Exit(0);
        }

        #region Windows Job Object Native API
        private static void SetupJobObject()
        {
            try
            {
                jobObjectHandle = CreateJobObject(IntPtr.Zero, null);
                JOBOBJECT_BASIC_LIMIT_INFORMATION basicLimits = new JOBOBJECT_BASIC_LIMIT_INFORMATION();
                basicLimits.LimitFlags = 0x2000; // JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE

                JOBOBJECT_EXTENDED_LIMIT_INFORMATION extendedLimits = new JOBOBJECT_EXTENDED_LIMIT_INFORMATION();
                extendedLimits.BasicLimitInformation = basicLimits;

                int length = Marshal.SizeOf(typeof(JOBOBJECT_EXTENDED_LIMIT_INFORMATION));
                IntPtr extendedLimitsPtr = Marshal.AllocHGlobal(length);
                Marshal.StructureToPtr(extendedLimits, extendedLimitsPtr, false);

                SetInformationJobObject(jobObjectHandle, 9, extendedLimitsPtr, (uint)length);
                Marshal.FreeHGlobal(extendedLimitsPtr);
            }
            catch { }
        }

        [DllImport("kernel32.dll", CharSet = CharSet.Auto)]
        private static extern IntPtr CreateJobObject(IntPtr lpJobAttributes, string lpName);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool SetInformationJobObject(IntPtr hJob, int JobObjectInfoClass, IntPtr lpJobObjectInfo, uint cbJobObjectInfoLength);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool AssignProcessToJobObject(IntPtr hJob, IntPtr hProcess);

        [DllImport("kernel32.dll", SetLastError = true)]
        private static extern bool CloseHandle(IntPtr hObject);

        [StructLayout(LayoutKind.Sequential)]
        private struct IO_COUNTERS
        {
            public UInt64 ReadOperationCount;
            public UInt64 WriteOperationCount;
            public UInt64 OtherOperationCount;
            public UInt64 ReadTransferCount;
            public UInt64 WriteTransferCount;
            public UInt64 OtherTransferCount;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_BASIC_LIMIT_INFORMATION
        {
            public Int64 PerProcessUserTimeLimit;
            public Int64 PerJobUserTimeLimit;
            public UInt32 LimitFlags;
            public UIntPtr MinimumWorkingSetSize;
            public UIntPtr MaximumWorkingSetSize;
            public UInt32 ActiveProcessLimit;
            public UIntPtr Affinity;
            public UInt32 PriorityClass;
            public UInt32 SchedulingClass;
        }

        [StructLayout(LayoutKind.Sequential)]
        private struct JOBOBJECT_EXTENDED_LIMIT_INFORMATION
        {
            public JOBOBJECT_BASIC_LIMIT_INFORMATION BasicLimitInformation;
            public IO_COUNTERS IoInfo;
            public UIntPtr ProcessMemoryLimit;
            public UIntPtr JobMemoryLimit;
            public UIntPtr PeakProcessMemoryLimit;
            public UIntPtr PeakJobMemoryLimit;
        }
        #endregion
    }
}
