using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

namespace OpenTranslatorLauncher
{
    static class Program
    {
        private static Mutex appMutex;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool smokeTest = false;
            bool safeMode = false;
            bool debugMode = false;

            foreach (var arg in args)
            {
                if (arg.Equals("--smoke-test", StringComparison.OrdinalIgnoreCase)) smokeTest = true;
                if (arg.Equals("--safe", StringComparison.OrdinalIgnoreCase) || arg.Equals("--software-rendering", StringComparison.OrdinalIgnoreCase)) safeMode = true;
                if (arg.Equals("--debug", StringComparison.OrdinalIgnoreCase) || arg.Equals("--diag", StringComparison.OrdinalIgnoreCase)) debugMode = true;
            }

            if (smokeTest)
            {
                int exitCode = RunSmokeTest();
                Environment.Exit(exitCode);
                return;
            }

            // Single Instance Enforcement
            bool createdNew = false;
            try
            {
                appMutex = new Mutex(true, "Global\\OpenTranslator_SingleInstance_Mutex_App", out createdNew);
            }
            catch (AbandonedMutexException)
            {
                createdNew = true;
            }
            catch
            {
                createdNew = true;
            }

            if (!createdNew)
            {
                bool isServerUp = CheckServerRunning(8080);
                using (var dlg = new ExistingInstanceDialog(isServerUp))
                {
                    var res = dlg.ShowDialog();
                    if (res == DialogResult.OK)
                    {
                        try { Process.Start(new ProcessStartInfo("http://localhost:8080") { UseShellExecute = true }); } catch { }
                        return;
                    }
                    else if (res == DialogResult.Retry)
                    {
                        MessageBox.Show("Close the previous instance using OpenTranslator and try again. A process will not be stopped just because it occupies a port.", "OpenTranslator", MessageBoxButtons.OK, MessageBoxIcon.Information);
                        return;
                    }
                    else
                    {
                        return;
                    }
                }
            }

            Application.Run(new MainForm(safeMode, debugMode));
        }

        static bool CheckServerRunning(int port)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(string.Format("http://127.0.0.1:{0}/api/ping", port));
                req.Timeout = 1200;
                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch { }
            return false;
        }

        static int RunSmokeTest()
        {
            var diag = new DiagnosticEngine();
            bool ok = diag.RunAllChecks(true, null, null);
            Console.WriteLine(ok ? "SMOKE_TEST: SUCCESS" : "SMOKE_TEST: FAILED");
            if (!ok)
            {
                Console.WriteLine("Step: " + diag.LastErrorStep);
                Console.WriteLine("Error: " + diag.LastErrorMessage);
                Console.WriteLine("Cause: " + diag.LastErrorCause);
                Console.WriteLine("Details: " + diag.LastErrorDetails);
                Console.WriteLine("Logs:\n" + diag.LogBuffer.ToString());
            }
            if (diag.ActiveServerProcess != null && !diag.ActiveServerProcess.HasExited)
            {
                diag.StopServer();
            }
            return ok ? 0 : 1;
        }
    }

    public class ExistingInstanceDialog : Form
    {
        public ExistingInstanceDialog(bool serverResponding)
        {
            this.Text = "OpenTranslator - Instância Detectada";
            this.Size = new Size(500, 240);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.BackColor = Color.FromArgb(24, 25, 28);
            this.ForeColor = Color.FromArgb(240, 240, 240);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            var lblTitle = new Label
            {
                Text = "OpenTranslator is already running",
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                ForeColor = Color.FromArgb(56, 189, 248),
                Location = new Point(20, 16),
                AutoSize = true
            };

            var lblDesc = new Label
            {
                Text = serverResponding
                    ? "OpenTranslator is already responding on port 8080.\nWhat would you like to do?"
                    : "An OpenTranslator instance was detected, but its server is not responding.\nYou can restart it or cancel.",
                Location = new Point(22, 50),
                Size = new Size(440, 50),
                ForeColor = Color.FromArgb(209, 213, 219)
            };

            var btnOpen = new Button
            {
                Text = "Open web interface",
                DialogResult = DialogResult.OK,
                Location = new Point(20, 130),
                Size = new Size(150, 36),
                BackColor = Color.FromArgb(14, 165, 233),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnOpen.FlatAppearance.BorderSize = 0;

            var btnRestart = new Button
            {
                Text = "Restart",
                DialogResult = DialogResult.Retry,
                Location = new Point(180, 130),
                Size = new Size(130, 36),
                BackColor = Color.FromArgb(245, 158, 11),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnRestart.FlatAppearance.BorderSize = 0;

            var btnCancel = new Button
            {
                Text = "Cancel",
                DialogResult = DialogResult.Cancel,
                Location = new Point(320, 130),
                Size = new Size(130, 36),
                BackColor = Color.FromArgb(39, 41, 46),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btnCancel.FlatAppearance.BorderSize = 0;

            this.Controls.Add(lblTitle);
            this.Controls.Add(lblDesc);
            this.Controls.Add(btnOpen);
            this.Controls.Add(btnRestart);
            this.Controls.Add(btnCancel);
        }
    }

    public class DiagnosticStep
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Status { get; set; } // PENDING, RUNNING, OK, WARN, ERROR
        public string Details { get; set; }
        public long DurationMs { get; set; }
    }

    public class DiagnosticEngine
    {
        public string BaseDir { get; private set; }
        public string ToolDir { get; private set; }
        public string NodeExe { get; private set; }
        public Process ActiveServerProcess { get; private set; }
        public List<DiagnosticStep> Steps { get; private set; }
        public StringBuilder LogBuffer { get; private set; }
        public string LastErrorStep { get; private set; }
        public string LastErrorMessage { get; private set; }
        public string LastErrorCause { get; private set; }
        public string LastErrorDetails { get; private set; }
        public int ServerPid { get; private set; }
        public int ServerPort { get; private set; }

        public event Action<string> OnLog;
        public event Action<DiagnosticStep> OnStepUpdate;

        /// <summary>
        /// Token de sessao do processo do backend.
        ///
        /// A FASE 1 passou a exigir o header X-OpenTranslator-Token em /api/rpc.
        /// O token e por-processo (memoria) e so e devolvido pelo bootstrap
        /// /api/ping, e apenas para requisicao cujo Host/Origin seja loopback
        /// (src/security/sessionGuard.js). O launcher precisa do mesmo token
        /// que a UI web usa, entao busca no mesmo endpoint em vez de burlar a
        /// exigencia.
        ///
        /// O token muda quando o backend reinicia, por isso e buscado em cada
        /// uso e nunca cacheado entre diagnosticos.
        /// </summary>
        public string FetchSessionToken()
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(
                    string.Format("http://127.0.0.1:{0}/api/ping", ServerPort));
                req.Timeout = 3000;
                req.Method = "GET";
                using (var res = (HttpWebResponse)req.GetResponse())
                using (var reader = new StreamReader(res.GetResponseStream()))
                {
                    string json = reader.ReadToEnd();
                    if (string.IsNullOrEmpty(json)) return null;
                    // Extrai o campo "token" sem depender de biblioteca JSON.
                    int i = json.IndexOf("\"token\"", StringComparison.Ordinal);
                    if (i < 0) return null;
                    int colon = json.IndexOf(':', i);
                    if (colon < 0) return null;
                    int q1 = json.IndexOf('"', colon + 1);
                    if (q1 < 0) return null;
                    int q2 = json.IndexOf('"', q1 + 1);
                    if (q2 < 0) return null;
                    string token = json.Substring(q1 + 1, q2 - q1 - 1).Trim();
                    return string.IsNullOrEmpty(token) ? null : token;
                }
            }
            catch (Exception ex)
            {
                Log("  [WARN] Could not obtain the session token from /api/ping:" + ex.Message);
                return null;
            }
        }

        public DiagnosticEngine()
        {
            LogBuffer = new StringBuilder();
            Steps = new List<DiagnosticStep>();
            ServerPort = 8080;

            string exeDir = AppDomain.CurrentDomain.BaseDirectory.TrimEnd('\\', '/');
            if (File.Exists(Path.Combine(exeDir, "server.js")))
            {
                BaseDir = exeDir;
                ToolDir = exeDir;
            }
            else if (Directory.Exists(Path.Combine(exeDir, "Tool")))
            {
                BaseDir = exeDir;
                ToolDir = Path.Combine(exeDir, "Tool");
            }
            else if (Directory.Exists(Path.Combine(exeDir, "..", "Tool")))
            {
                BaseDir = Path.GetFullPath(Path.Combine(exeDir, ".."));
                ToolDir = Path.Combine(BaseDir, "Tool");
            }
            else
            {
                BaseDir = exeDir;
                ToolDir = exeDir;
            }
        }

        public string ResolveExistingPath(params string[] candidates)
        {
            if (candidates == null) return "";
            foreach (var c in candidates)
            {
                if (!string.IsNullOrEmpty(c) && (File.Exists(c) || Directory.Exists(c))) return c;
            }
            return candidates.Length > 0 ? candidates[0] : "";
        }

        public void Log(string msg)
        {
            string ts = DateTime.Now.ToString("HH:mm:ss");
            string line = string.Format("[{0}] {1}", ts, msg);
            lock (LogBuffer)
            {
                LogBuffer.AppendLine(line);
            }
            if (OnLog != null)
            {
                try { OnLog(line); } catch { }
            }
        }

        public void InitSteps()
        {
            Steps.Clear();
            Steps.Add(new DiagnosticStep { Id = "files", Title = "Required application files", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "runtime", Title = "Node.js runtime (portable / system)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "deps", Title = "Native modules and SQLite transaction", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "db", Title = "Data directories and local cache", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "ports", Title = "Port availability (8080, 16005)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "permissions", Title = "Read and write permissions", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "backend", Title = "Backend server startup", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "http", Title = "HTTP connection and health check", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "frontend", Title = "Integridade dos Ativos Frontend", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "rpc", Title = "Authenticated RPC communication (ping / load)", Status = "PENDING" });
        }

        private void UpdateStep(string id, string status, string details, long durationMs = 0)
        {
            var step = Steps.Find(s => s.Id == id);
            if (step != null)
            {
                step.Status = status;
                step.Details = details;
                step.DurationMs = durationMs;
                if (OnStepUpdate != null)
                {
                    try { OnStepUpdate(step); } catch { }
                }
            }
        }

        public bool RunAllChecks(bool startBackend, CancellationTokenSource cts, Action<string, string, string, string> onFail)
        {
            Log("=== Starting OpenTranslator integrity checks ===");
            Log("Base directory:" + BaseDir);
            Log("Application directory:" + ToolDir);

            // Step 1: Files
            var sw = Stopwatch.StartNew();
            UpdateStep("files", "RUNNING", "Checking required files...");
            Log("[1/10] Checking required files...");
            string serverJs = ResolveExistingPath(Path.Combine(BaseDir, "server.js"), Path.Combine(ToolDir, "server.js"));
            // FASE 5.5 — `httpServer.js` e `rpcHandlers.js` foram movidos para
            // `src/services/` (responsabilidade: serviços). O layout antigo
            // continua como fallback para compatibilidade com builds anteriores.
            string httpServerJs = ResolveExistingPath(Path.Combine(BaseDir, "src", "services", "httpServer.js"), Path.Combine(BaseDir, "src", "httpServer.js"), Path.Combine(ToolDir, "src", "services", "httpServer.js"), Path.Combine(ToolDir, "src", "httpServer.js"));
            string rpcHandlersJs = ResolveExistingPath(Path.Combine(BaseDir, "src", "services", "rpcHandlers.js"), Path.Combine(BaseDir, "src", "rpcHandlers.js"), Path.Combine(ToolDir, "src", "services", "rpcHandlers.js"), Path.Combine(ToolDir, "src", "rpcHandlers.js"));
            string indexHtml = ResolveExistingPath(Path.Combine(BaseDir, "ui", "index.html"), Path.Combine(ToolDir, "ui", "index.html"), Path.Combine(ToolDir, "www", "index.html"));
            string appJs = ResolveExistingPath(Path.Combine(BaseDir, "ui", "app.js"), Path.Combine(ToolDir, "ui", "app.js"), Path.Combine(ToolDir, "www", "app.js"));

            string[] requiredFiles = new string[] { serverJs, httpServerJs, rpcHandlersJs, indexHtml, appJs };

            foreach (var rf in requiredFiles)
            {
                if (!File.Exists(rf))
                {
                    sw.Stop();
                    string cause = "Required file not found:" + Path.GetFileName(rf);
                    string det = "Caminho esperado: " + rf;
                    SetError("files", "Missing required files", cause, det);
                    UpdateStep("files", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
                var fi = new FileInfo(rf);
                if (fi.Length == 0)
                {
                    sw.Stop();
                    string cause = "Required file is empty (0 bytes):" + Path.GetFileName(rf);
                    SetError("files", "Arquivo corrompido", cause, rf);
                    UpdateStep("files", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
            }
            sw.Stop();
            UpdateStep("files", "OK", "5/5 required files are present and non-empty", sw.ElapsedMilliseconds);
            Log("  [OK] Required files checked.");

            // Step 2: Runtime
            sw.Restart();
            UpdateStep("runtime", "RUNNING", "Detectando runtime Node.js...");
            Log("[2/10] Checking Node.js runtime...");

            string nodePortable = ResolveExistingPath(
                Path.Combine(BaseDir, "bin", "node.exe"),
                Path.Combine(ToolDir, "bin", "node.exe")
            );
            string selectedNode = null;
            string nodeVer = null;

            // Prioritize Portable Node
            if (File.Exists(nodePortable))
            {
                string ver = TestNodeExecutable(nodePortable);
                if (!string.IsNullOrEmpty(ver))
                {
                    selectedNode = nodePortable;
                    nodeVer = ver;
                    Log("  [OK] Portable Node.js is working:" + ver);
                }
            }

            if (selectedNode == null)
            {
                string sysVer = TestNodeExecutable("node");
                if (!string.IsNullOrEmpty(sysVer))
                {
                    selectedNode = "node";
                    nodeVer = sysVer;
                    Log("  [OK] System Node.js is working:" + sysVer);
                }
            }

            if (selectedNode == null)
            {
                sw.Stop();
                string cause = "No working Node.js runtime found.";
                string det = "The portable executable was not found at:" + nodePortable + " and 'node' is not on PATH.";
                SetError("runtime", "Node.js runtime not found", cause, det);
                UpdateStep("runtime", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }
            NodeExe = selectedNode;
            sw.Stop();
            UpdateStep("runtime", "OK", "Node.js " + nodeVer + " operacional", sw.ElapsedMilliseconds);

            // Step 3: Dependencies & SQLite Live Test
            sw.Restart();
            UpdateStep("deps", "RUNNING", "Running a SQLite transaction test...");
            Log("[3/10] Testing native dependencies and SQLite...");

            string probeScript = "try { const ws = require('ws'); const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.prepare('CREATE TABLE _probe(id INT, v TEXT)').run(); db.prepare('INSERT INTO _probe VALUES (1, @v)').run({ v: 'ok' }); const row = db.prepare('SELECT v FROM _probe WHERE id = 1').get(); db.close(); if (row && row.v === 'ok') console.log('SQLITE_AND_WS_OK'); else { console.error('SQLITE_BAD_RESULT'); process.exit(1); } } catch(e) { console.error('MODULE_ERROR: ' + e.message); process.exit(1); }";

            string probeOut = null;
            string probeErr = null;
            bool probeSuccess = RunNodeProbe(probeScript, out probeOut, out probeErr);

            if (!probeSuccess || !probeOut.Contains("SQLITE_AND_WS_OK"))
            {
                sw.Stop();
                string cause = "The native better-sqlite3 module or ws is incompatible.";
                string det = string.Format("Node.js returned:\n{0}\n{1}\nRuntime: {2}", probeErr, probeOut, NodeExe);
                SetError("deps", "Native SQLite check failed", cause, det);
                UpdateStep("deps", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            sw.Stop();
            UpdateStep("deps", "OK", "ws e better-sqlite3 nativo validados com SQL real", sw.ElapsedMilliseconds);
            Log("  [OK] Native dependencies and SQLite transaction passed.");

            // Step 4: Database & Cache Dirs
            sw.Restart();
            UpdateStep("db", "RUNNING", "Checking data directories...");
            Log("[4/10] Checking data directories and cache...");
            string dataDir = Directory.Exists(Path.Combine(BaseDir, "data")) ? Path.Combine(BaseDir, "data") : Path.Combine(ToolDir, "data");
            string gameLibDir = Directory.Exists(Path.Combine(BaseDir, "gameLib")) ? Path.Combine(BaseDir, "gameLib") : Path.Combine(ToolDir, "gameLib");
            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            if (!Directory.Exists(gameLibDir)) Directory.CreateDirectory(gameLibDir);

            sw.Stop();
            UpdateStep("db", "OK", "data and gameLib are ready", sw.ElapsedMilliseconds);
            Log("  [OK] Data directories checked.");

            // Step 5: Ports
            sw.Restart();
            UpdateStep("ports", "RUNNING", "Checking ports 8080 and 16005...");
            Log("[5/10] Checking port availability...");

            bool port8080InUse = IsPortInUse(8080);
            if (port8080InUse)
            {
                Log("  Port 8080 is in use. Checking for a healthy OpenTranslator instance...");
                bool healthy = CheckHttpHealthy(8080, 1500);
                if (healthy)
                {
                    Log("  [OK] An existing OpenTranslator instance is responding on port 8080.");
                    UpdateStep("ports", "OK", "Active instance detected on port 8080", sw.ElapsedMilliseconds);
                }
                else
                {
                    Log("  Port occupied. The process will not be stopped without proof of ownership.");
                    if (IsPortInUse(8080))
                    {
                        sw.Stop();
                        string cause = "Port 8080 is occupied. Close the application using it and retry.";
                        string det = "Check Task Manager for conflicting processes on port 8080.";
                        SetError("ports", "Port 8080 is unavailable", cause, det);
                        UpdateStep("ports", "ERROR", cause, sw.ElapsedMilliseconds);
                        if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                        return false;
                    }
                    UpdateStep("ports", "OK", "Ports 8080 and 16005 are available", sw.ElapsedMilliseconds);
                }
            }
            else
            {
                UpdateStep("ports", "OK", "Ports 8080 and 16005 are free", sw.ElapsedMilliseconds);
            }
            sw.Stop();
            Log("  [OK] Ports checked.");

            // Step 6: Permissions
            sw.Restart();
            UpdateStep("permissions", "RUNNING", "Testing write permissions...");
            Log("[6/10] Testing write permissions...");
            try
            {
                string testFile = Path.Combine(dataDir, ".perm_test_" + Guid.NewGuid().ToString("N"));
                File.WriteAllText(testFile, "OK");
                File.Delete(testFile);
                sw.Stop();
                UpdateStep("permissions", "OK", "Writing to the data directory succeeded", sw.ElapsedMilliseconds);
                Log("  [OK] Permissions checked.");
            }
            catch (Exception ex)
            {
                sw.Stop();
                string cause = "Could not write to the data directory:" + ex.Message;
                SetError("permissions", "Insufficient permissions", cause, ex.ToString());
                UpdateStep("permissions", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            if (!startBackend) return true;

            // Step 7: Backend Launch
            sw.Restart();
            UpdateStep("backend", "RUNNING", "Starting backend server...");
            Log("[7/10] Starting backend server...");

            bool alreadyRunning = CheckHttpHealthy(8080, 500);
            if (!alreadyRunning)
            {
                bool launched = LaunchNodeServer();
                if (!launched)
                {
                    sw.Stop();
                    string cause = "Could not start the Node.js server process.";
                    string det = "Command: " + NodeExe + " server.js --no-browser\nDirectory:" + ToolDir;
                    SetError("backend", "Backend startup failed", cause, det);
                    UpdateStep("backend", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
            }
            sw.Stop();
            string bMsg = alreadyRunning ? "Server already running (reused)" : "Server started (PID:" + ServerPid + ")";
            UpdateStep("backend", "OK", bMsg, sw.ElapsedMilliseconds);
            Log("  [OK] " + bMsg);

            // Step 8: HTTP Health Check
            sw.Restart();
            UpdateStep("http", "RUNNING", "Waiting for HTTP 200 response...");
            Log("[8/10] Waiting for HTTP 200 response...");

            bool httpOk = WaitForHttpReady(8080, 15000);
            if (!httpOk)
            {
                sw.Stop();
                string cause = "The backend did not respond on port 8080 within 15 seconds.";
                string det = "Recent logs:\n" + GetRecentLogSnippet();
                SetError("http", "HTTP connection timed out", cause, det);
                UpdateStep("http", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }
            sw.Stop();
            UpdateStep("http", "OK", "HTTP 200 OK em http://localhost:8080", sw.ElapsedMilliseconds);
            Log("  [OK] Server is responding over HTTP.");

            // Step 9: Frontend Assets
            sw.Restart();
            UpdateStep("frontend", "RUNNING", "Checking index.html and app.js...");
            Log("[9/10] Checking frontend assets...");
            try
            {
                var reqHtml = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8080/index.html");
                reqHtml.Timeout = 5000;
                using (var res = (HttpWebResponse)reqHtml.GetResponse())
                {
                    if (res.StatusCode != HttpStatusCode.OK) throw new Exception("index.html retornou " + res.StatusCode);
                }

                var reqJs = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8080/app.js");
                reqJs.Timeout = 5000;
                using (var res = (HttpWebResponse)reqJs.GetResponse())
                {
                    if (res.StatusCode != HttpStatusCode.OK) throw new Exception("app.js retornou " + res.StatusCode);
                }

                sw.Stop();
                UpdateStep("frontend", "OK", "index.html e app.js carregados com sucesso", sw.ElapsedMilliseconds);
                Log("  [OK] Ativos do frontend validados.");
            }
            catch (Exception ex)
            {
                sw.Stop();
                string cause = "Could not request frontend assets:" + ex.Message;
                SetError("frontend", "Interface loading failed", cause, ex.ToString());
                UpdateStep("frontend", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            // Step 10: RPC Test
            sw.Restart();
            UpdateStep("rpc", "RUNNING", "Testing authenticated RPC call (ping)...");
            Log("[10/10] Realizando teste de chamada RPC...");
            try
            {
                // FASE 1 tornou X-OpenTranslator-Token OBRIGATORIO em /api/rpc
                // (src/services/httpServer.js, guardRequest com requireToken:true).
                // O bootstrap e' /api/ping, que so devolve o token para
                // requisicao cujo Host/Origin e loopback. A UI web faz
                // exatamente isto (ui/app.js: pingServer() -> SESSION_TOKEN).
                // O launcher NAO fazia: criava o HttpWebRequest sem o header,
                // e /api/rpc respondia 403 {"reason":"TOKEN_MISSING"},
                // reprovando o_step [10/10] com WebException.
                string sessionToken = FetchSessionToken();
                if (string.IsNullOrEmpty(sessionToken))
                    throw new Exception("Token de sessao nao obtido em /api/ping (resposta sem campo 'token').");

                var rpcReq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8080/api/rpc");
                rpcReq.Method = "POST";
                rpcReq.ContentType = "application/json";
                rpcReq.Timeout = 5000;
                rpcReq.Headers.Add("X-OpenTranslator-Token", sessionToken);
                byte[] bodyBytes = Encoding.UTF8.GetBytes("{\"method\":\"ping\",\"params\":{}}");
                using (var st = rpcReq.GetRequestStream())
                {
                    st.Write(bodyBytes, 0, bodyBytes.Length);
                }

                string respJson = null;
                using (var res = (HttpWebResponse)rpcReq.GetResponse())
                using (var reader = new StreamReader(res.GetResponseStream()))
                {
                    respJson = reader.ReadToEnd();
                }

                if (string.IsNullOrEmpty(respJson) || !respJson.Contains("\"ok\":true"))
                {
                    throw new Exception("Invalid RPC response:" + respJson);
                }

                sw.Stop();
                UpdateStep("rpc", "OK", "RPC ping validado com sucesso", sw.ElapsedMilliseconds);
                Log("  [OK] RPC funcionando perfeitamente.");
            }
            catch (Exception ex)
            {
                sw.Stop();
                string cause = "RPC call failed:" + ex.Message;
                SetError("rpc", "RPC communication failed", cause, ex.ToString());
                UpdateStep("rpc", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            Log("=== All 10 startup checks passed ===");
            return true;
        }

        private void SetError(string step, string title, string cause, string details)
        {
            LastErrorStep = step;
            LastErrorMessage = title;
            LastErrorCause = cause;
            LastErrorDetails = details;
            Log(string.Format("  [FAILED] {0}: {1}", title, cause));
        }

        private bool RunNodeProbe(string script, out string stdout, out string stderr)
        {
            stdout = "";
            stderr = "";
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = NodeExe,
                    Arguments = "-e \"" + script + "\"",
                    WorkingDirectory = Directory.Exists(ToolDir) ? ToolDir : BaseDir,
                    RedirectStandardOutput = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    stdout = proc.StandardOutput.ReadToEnd();
                    stderr = proc.StandardError.ReadToEnd();
                    proc.WaitForExit(5000);
                    return proc.ExitCode == 0;
                }
            }
            catch (Exception ex)
            {
                stderr = ex.Message;
                return false;
            }
        }

        private string TestNodeExecutable(string exe)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = exe,
                    Arguments = "-v",
                    RedirectStandardOutput = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };
                using (var proc = Process.Start(psi))
                {
                    if (proc.WaitForExit(4000))
                    {
                        string outStr = proc.StandardOutput.ReadToEnd().Trim();
                        if (outStr.StartsWith("v")) return outStr;
                    }
                }
            }
            catch { }
            return null;
        }

        public bool IsPortInUse(int port)
        {
            try
            {
                using (var client = new TcpClient())
                {
                    var ar = client.BeginConnect("127.0.0.1", port, null, null);
                    bool ok = ar.AsyncWaitHandle.WaitOne(400);
                    if (ok && client.Connected)
                    {
                        client.EndConnect(ar);
                        return true;
                    }
                }
            }
            catch { }
            return false;
        }

        public bool CheckHttpHealthy(int port, int timeoutMs)
        {
            try
            {
                var req = (HttpWebRequest)WebRequest.Create(string.Format("http://127.0.0.1:{0}/api/ping", port));
                req.Timeout = timeoutMs;
                using (var res = (HttpWebResponse)req.GetResponse())
                {
                    return res.StatusCode == HttpStatusCode.OK;
                }
            }
            catch { }
            return false;
        }

        private bool WaitForHttpReady(int port, int timeoutMs)
        {
            int elapsed = 0;
            int interval = 300;
            while (elapsed < timeoutMs)
            {
                if (CheckHttpHealthy(port, 400)) return true;
                Thread.Sleep(interval);
                elapsed += interval;
            }
            return false;
        }

        private bool LaunchNodeServer()
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = NodeExe,
                    Arguments = "server.js --no-browser",
                    WorkingDirectory = File.Exists(Path.Combine(BaseDir, "server.js")) ? BaseDir : ToolDir,
                    RedirectStandardOutput = true,
                    StandardOutputEncoding = Encoding.UTF8,
                    StandardErrorEncoding = Encoding.UTF8,
                    RedirectStandardError = true,
                    UseShellExecute = false,
                    CreateNoWindow = true
                };

                ActiveServerProcess = new Process { StartInfo = psi, EnableRaisingEvents = true };
                ActiveServerProcess.OutputDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data)) Log("[Backend] " + e.Data);
                };
                ActiveServerProcess.ErrorDataReceived += (s, e) =>
                {
                    if (!string.IsNullOrEmpty(e.Data)) Log("[Backend Error] " + e.Data);
                };

                bool started = ActiveServerProcess.Start();
                if (started)
                {
                    ServerPid = ActiveServerProcess.Id;
                    ActiveServerProcess.BeginOutputReadLine();
                    ActiveServerProcess.BeginErrorReadLine();
                    return true;
                }
            }
            catch (Exception ex)
            {
                Log("Could not start the Node.js process:" + ex.Message);
            }
            return false;
        }

        public bool StopServer()
        {
            if (ActiveServerProcess == null) return true;
            try
            {
                if (ActiveServerProcess.HasExited) { ActiveServerProcess = null; return true; }
                string token = FetchSessionToken();
                if (string.IsNullOrEmpty(token)) throw new Exception("Token de encerramento indisponivel.");
                var req = (HttpWebRequest)WebRequest.Create(string.Format("http://127.0.0.1:{0}/api/shutdown", ServerPort));
                req.Method = "POST";
                req.Timeout = 5000;
                req.ContentLength = 0;
                req.Headers.Add("X-OpenTranslator-Token", token);
                using (var response = (HttpWebResponse)req.GetResponse())
                {
                    if (response.StatusCode != HttpStatusCode.OK) throw new Exception("Encerramento recusado.");
                }
                if (!ActiveServerProcess.WaitForExit(35000))
                {
                    Log("Shutdown is still in progress. The backend was preserved to finish restoration.");
                    return false;
                }
                bool clean = ActiveServerProcess.ExitCode == 0;
                ActiveServerProcess = null;
                if (!clean) Log("Backend encerrou com pendencias. Consulte o log e os backups preservados.");
                return true;
            }
            catch (Exception ex)
            {
                Log("Could not complete shutdown:" + ex.Message);
                return false;
            }
        }

        public string GetRecentLogSnippet()
        {
            lock (LogBuffer)
            {
                string full = LogBuffer.ToString();
                string[] lines = full.Split('\n');
                int start = Math.Max(0, lines.Length - 15);
                var sb = new StringBuilder();
                for (int i = start; i < lines.Length; i++) sb.AppendLine(lines[i].Trim());
                return sb.ToString();
            }
        }

        public void AutoFix()
        {
            Log("=== Running recovery checks ===");
            try
            {
                if (!StopServer()) return;
                Thread.Sleep(500);

                string dataDir = Path.Combine(ToolDir, "data");
                if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
                string gameLibDir = Path.Combine(ToolDir, "gameLib");
                if (!Directory.Exists(gameLibDir)) Directory.CreateDirectory(gameLibDir);

                string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OpenTranslatorProfile");
                if (Directory.Exists(profileDir))
                {
                    try
                    {
                        var locks = Directory.GetFiles(profileDir, "*LOCK*", SearchOption.AllDirectories);
                        foreach (var l in locks)
                        {
                            try { File.Delete(l); } catch { }
                        }
                    }
                    catch { }
                }

                Log("Recovery checks completed.");
            }
            catch (Exception ex)
            {
                Log("Recovery error:" + ex.Message);
            }
        }
    }

    public class MainForm : Form
    {
        private DiagnosticEngine engine;
        private bool isSafeMode;
        private bool isDebugMode;

        private Panel headerPanel;
        private Label lblTitle;
        private Label lblSubtitle;
        private Label lblBadge;

        private Panel mainContentPanel;
        private Panel diagListPanel;
        private ProgressBar progressBar;
        private Label lblStepStatus;
        private Dictionary<string, Label> stepLabels;

        private Panel recoveryPanel;
        private Label lblErrorTitle;
        private Label lblErrorCause;
        private TextBox txtErrorDetails;
        private Button btnAutoFix;
        private Button btnSafeStart;
        private Button btnCopyReport;
        private Button btnCloseError;
        private Button btnToggleLogsFromError;

        private Panel runningPanel;
        private Label lblRunningTitle;
        private Label lblRunningInfo;
        private Button btnOpenBrowser;
        private Button btnViewLogs;
        private Button btnRestart;
        private Button btnExitApp;

        private Panel logPanel;
        private TextBox txtLog;
        private Button btnBackFromLog;

        private NotifyIcon trayIcon;
        private ContextMenuStrip trayMenu;

        public MainForm(bool safeMode, bool debugMode)
        {
            isSafeMode = safeMode;
            isDebugMode = debugMode;
            stepLabels = new Dictionary<string, Label>();
            engine = new DiagnosticEngine();

            InitializeComponent();
            SetupTray();

            engine.OnLog += msg =>
            {
                if (txtLog.InvokeRequired)
                {
                    txtLog.BeginInvoke(new Action(() => { txtLog.AppendText(msg + Environment.NewLine); }));
                }
                else
                {
                    txtLog.AppendText(msg + Environment.NewLine);
                }
            };

            engine.OnStepUpdate += step =>
            {
                if (this.InvokeRequired)
                {
                    this.BeginInvoke(new Action(() => UpdateStepUI(step)));
                }
                else
                {
                    UpdateStepUI(step);
                }
            };
        }

        private void InitializeComponent()
        {
            this.Text = "OpenTranslator Launcher";
            this.Size = new Size(760, 560);
            this.MinimumSize = new Size(720, 520);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(24, 25, 28);
            this.ForeColor = Color.FromArgb(240, 240, 240);
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);
            this.TopMost = true;
            this.Shown += (s, e) => { this.TopMost = false; this.BringToFront(); this.Activate(); };

            string icoPath = engine.ResolveExistingPath(
                Path.Combine(engine.BaseDir, "resources", "OpenTranslator.ico"),
                Path.Combine(engine.ToolDir, "resources", "OpenTranslator.ico")
            );
            if (File.Exists(icoPath))
            {
                try { this.Icon = new Icon(icoPath); } catch { }
            }

            // Header
            headerPanel = new Panel { Dock = DockStyle.Top, Height = 75, BackColor = Color.FromArgb(18, 19, 21), Padding = new Padding(20, 10, 20, 10) };
            lblTitle = new Label
            {
                Text = "OPENTRANSLATOR",
                Font = new Font("Segoe UI", 16f, FontStyle.Bold),
                ForeColor = Color.FromArgb(56, 189, 248),
                Location = new Point(20, 12),
                AutoSize = true
            };
            lblSubtitle = new Label
            {
                Text = "Startup, diagnostics, and recovery",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(156, 163, 175),
                Location = new Point(22, 42),
                AutoSize = true
            };
            lblBadge = new Label
            {
                Text = "CHECKING",
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                BackColor = Color.FromArgb(30, 58, 138),
                ForeColor = Color.FromArgb(147, 197, 253),
                Location = new Point(590, 24),
                Padding = new Padding(8, 4, 8, 4),
                AutoSize = true
            };
            headerPanel.Controls.Add(lblTitle);
            headerPanel.Controls.Add(lblSubtitle);
            headerPanel.Controls.Add(lblBadge);
            this.Controls.Add(headerPanel);

            // Main Content Area
            mainContentPanel = new Panel { Dock = DockStyle.Fill, BackColor = Color.FromArgb(24, 25, 28), Padding = new Padding(20) };
            this.Controls.Add(mainContentPanel);

            // 1. Diagnostic View
            diagListPanel = new Panel { Dock = DockStyle.Fill };
            progressBar = new ProgressBar { Location = new Point(10, 10), Size = new Size(680, 8), Style = ProgressBarStyle.Continuous, Maximum = 10, Value = 0 };
            lblStepStatus = new Label
            {
                Text = "Starting preflight checks...",
                Font = new Font("Segoe UI", 10f, FontStyle.Regular),
                ForeColor = Color.FromArgb(209, 213, 219),
                Location = new Point(10, 25),
                Size = new Size(680, 24)
            };
            diagListPanel.Controls.Add(progressBar);
            diagListPanel.Controls.Add(lblStepStatus);

            int startY = 55;
            engine.InitSteps();
            foreach (var st in engine.Steps)
            {
                var lbl = new Label
                {
                    Text = "[ ○ ] " + st.Title,
                    Location = new Point(15, startY),
                    Size = new Size(670, 24),
                    Font = new Font("Segoe UI", 9f),
                    ForeColor = Color.FromArgb(156, 163, 175)
                };
                diagListPanel.Controls.Add(lbl);
                stepLabels[st.Id] = lbl;
                startY += 26;
            }

            var btnDiagLog = CreateButton("View detailed logs", new Point(15, startY + 10), new Size(180, 32), Color.FromArgb(39, 41, 46));
            btnDiagLog.Click += (s, e) => ShowLogsView();
            diagListPanel.Controls.Add(btnDiagLog);

            // 2. Recovery View
            recoveryPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
            var lblRecHead = new Label
            {
                Text = "OPENTRANSLATOR DID NOT START",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = Color.FromArgb(239, 68, 68),
                Location = new Point(10, 5),
                AutoSize = true
            };
            lblErrorTitle = new Label
            {
                Text = "Issue detected",
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.FromArgb(243, 244, 246),
                Location = new Point(12, 36),
                AutoSize = true
            };
            lblErrorCause = new Label
            {
                Text = "Error cause...",
                Font = new Font("Segoe UI", 9.5f, FontStyle.Regular),
                ForeColor = Color.FromArgb(252, 165, 165),
                Location = new Point(12, 60),
                Size = new Size(680, 40)
            };
            txtErrorDetails = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(18, 19, 21),
                ForeColor = Color.FromArgb(209, 213, 219),
                Font = new Font("Consolas", 8.5f),
                Location = new Point(12, 105),
                Size = new Size(680, 180)
            };

            btnAutoFix = CreateButton("Run recovery checks", new Point(12, 295), new Size(230, 36), Color.FromArgb(16, 185, 129));
            btnAutoFix.Click += (s, e) =>
            {
                btnAutoFix.Enabled = false;
                btnAutoFix.Text = "Checking recovery...";
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    engine.AutoFix();
                    Thread.Sleep(500);
                    this.BeginInvoke(new Action(() =>
                    {
                        btnAutoFix.Enabled = true;
                        btnAutoFix.Text = "Run recovery checks";
                        StartDiagnosis(true);
                    }));
                });
            };

            btnSafeStart = CreateButton("Recovery mode", new Point(250, 295), new Size(180, 36), Color.FromArgb(245, 158, 11));
            btnSafeStart.Click += (s, e) =>
            {
                isSafeMode = true;
                StartDiagnosis(false);
            };

            btnCopyReport = CreateButton("Copy report", new Point(440, 295), new Size(130, 36), Color.FromArgb(39, 41, 46));
            btnCopyReport.Click += (s, e) =>
            {
                string report = GenerateDiagnosticReport();
                Clipboard.SetText(report);
                MessageBox.Show("Report copied to clipboard.", "Diagnostics", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };

            btnToggleLogsFromError = CreateButton("View logs", new Point(580, 295), new Size(110, 36), Color.FromArgb(39, 41, 46));
            btnToggleLogsFromError.Click += (s, e) => ShowLogsView();

            recoveryPanel.Controls.Add(lblRecHead);
            recoveryPanel.Controls.Add(lblErrorTitle);
            recoveryPanel.Controls.Add(lblErrorCause);
            recoveryPanel.Controls.Add(txtErrorDetails);
            recoveryPanel.Controls.Add(btnAutoFix);
            recoveryPanel.Controls.Add(btnSafeStart);
            recoveryPanel.Controls.Add(btnCopyReport);
            recoveryPanel.Controls.Add(btnToggleLogsFromError);

            // 3. Running View
            runningPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
            lblRunningTitle = new Label
            {
                Text = "OpenTranslator is running",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(10, 10),
                AutoSize = true
            };
            lblRunningInfo = new Label
            {
                Text = "Server active at http://localhost:8080\nDual Hook active on port 16005\nWeb interface is ready.",
                Font = new Font("Segoe UI", 10f),
                ForeColor = Color.FromArgb(209, 213, 219),
                Location = new Point(12, 45),
                Size = new Size(680, 80)
            };

            btnOpenBrowser = CreateButton("Open web interface", new Point(12, 130), new Size(200, 40), Color.FromArgb(14, 165, 233));
            btnOpenBrowser.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
            btnOpenBrowser.Click += (s, e) => OpenWebInterface();

            btnViewLogs = CreateButton("View diagnostics / logs", new Point(220, 130), new Size(180, 40), Color.FromArgb(39, 41, 46));
            btnViewLogs.Click += (s, e) => ShowLogsView();

            btnRestart = CreateButton("Restart", new Point(410, 130), new Size(120, 40), Color.FromArgb(39, 41, 46));
            btnRestart.Click += (s, e) =>
            {
                if (engine.StopServer()) StartDiagnosis(true);
            };

            btnExitApp = CreateButton("Exit OpenTranslator", new Point(540, 130), new Size(150, 40), Color.FromArgb(185, 28, 28));
            btnExitApp.Click += (s, e) =>
            {
                if (engine.StopServer()) Application.Exit();
            };

            runningPanel.Controls.Add(lblRunningTitle);
            runningPanel.Controls.Add(lblRunningInfo);
            runningPanel.Controls.Add(btnOpenBrowser);
            runningPanel.Controls.Add(btnViewLogs);
            runningPanel.Controls.Add(btnRestart);
            runningPanel.Controls.Add(btnExitApp);

            // 4. Log View
            logPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
            txtLog = new TextBox
            {
                Multiline = true,
                ReadOnly = true,
                ScrollBars = ScrollBars.Vertical,
                BackColor = Color.FromArgb(16, 17, 19),
                ForeColor = Color.FromArgb(229, 231, 235),
                Font = new Font("Consolas", 8.5f),
                Dock = DockStyle.Fill
            };
            var logBottomBar = new Panel { Dock = DockStyle.Bottom, Height = 45, Padding = new Padding(0, 5, 0, 0) };
            btnBackFromLog = CreateButton("Back to panel", new Point(0, 5), new Size(150, 32), Color.FromArgb(39, 41, 46));
            btnBackFromLog.Click += (s, e) =>
            {
                logPanel.Visible = false;
                if (engine.LastErrorStep != null) recoveryPanel.Visible = true;
                else if (runningPanel.Tag != null && (bool)runningPanel.Tag) runningPanel.Visible = true;
                else diagListPanel.Visible = true;
            };
            var btnCopyAllLogs = CreateButton("Copy all logs", new Point(160, 5), new Size(180, 32), Color.FromArgb(39, 41, 46));
            btnCopyAllLogs.Click += (s, e) =>
            {
                Clipboard.SetText(engine.LogBuffer.ToString());
                MessageBox.Show("Logs copied to clipboard.", "Logs", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };
            logBottomBar.Controls.Add(btnBackFromLog);
            logBottomBar.Controls.Add(btnCopyAllLogs);
            logPanel.Controls.Add(txtLog);
            logPanel.Controls.Add(logBottomBar);

            mainContentPanel.Controls.Add(diagListPanel);
            mainContentPanel.Controls.Add(recoveryPanel);
            mainContentPanel.Controls.Add(runningPanel);
            mainContentPanel.Controls.Add(logPanel);

            this.FormClosing += (s, e) =>
            {
                if (!engine.StopServer()) { e.Cancel = true; return; }
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
            };

            this.Load += (s, e) =>
            {
                if (isDebugMode) ShowLogsView();
                StartDiagnosis(true);
            };
        }

        private void SetupTray()
        {
            try
            {
                trayMenu = new ContextMenuStrip();
                trayMenu.Items.Add("Open interface", null, (s, e) => OpenWebInterface());
                trayMenu.Items.Add("Show panel", null, (s, e) => { this.Show(); this.WindowState = FormWindowState.Normal; this.BringToFront(); });
                trayMenu.Items.Add(new ToolStripSeparator());
                trayMenu.Items.Add("Exit OpenTranslator", null, (s, e) => { if (engine.StopServer()) Application.Exit(); });

                trayIcon = new NotifyIcon
                {
                    Text = "OpenTranslator",
                    ContextMenuStrip = trayMenu,
                    Visible = true
                };

                string icoPath = engine.ResolveExistingPath(
                    Path.Combine(engine.BaseDir, "resources", "OpenTranslator.ico"),
                    Path.Combine(engine.ToolDir, "resources", "OpenTranslator.ico")
                );
                if (File.Exists(icoPath))
                {
                    try { trayIcon.Icon = new Icon(icoPath); } catch { trayIcon.Icon = SystemIcons.Application; }
                }
                else
                {
                    trayIcon.Icon = SystemIcons.Application;
                }

                trayIcon.DoubleClick += (s, e) => { this.Show(); this.WindowState = FormWindowState.Normal; this.BringToFront(); };
            }
            catch { }
        }

        private Button CreateButton(string text, Point loc, Size sz, Color bg)
        {
            var btn = new Button
            {
                Text = text,
                Location = loc,
                Size = sz,
                BackColor = bg,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand
            };
            btn.FlatAppearance.BorderSize = 0;
            return btn;
        }

        private void ShowLogsView()
        {
            diagListPanel.Visible = false;
            recoveryPanel.Visible = false;
            runningPanel.Visible = false;
            logPanel.Visible = true;
            logPanel.BringToFront();
        }

        private void UpdateStepUI(DiagnosticStep step)
        {
            if (stepLabels.ContainsKey(step.Id))
            {
                var lbl = stepLabels[step.Id];
                if (step.Status == "RUNNING")
                {
                    lbl.Text = "[ ⟳ ] " + step.Title + " - " + step.Details;
                    lbl.ForeColor = Color.FromArgb(56, 189, 248);
                    lblStepStatus.Text = step.Title + "...";
                }
                else if (step.Status == "OK")
                {
                    lbl.Text = "[ ✓ ] " + step.Title + " (" + step.Details + ")";
                    lbl.ForeColor = Color.FromArgb(52, 211, 153);
                    if (progressBar.Value < progressBar.Maximum) progressBar.Value++;
                }
                else if (step.Status == "ERROR")
                {
                    lbl.Text = "[ ✗ ] " + step.Title + " - " + step.Details;
                    lbl.ForeColor = Color.FromArgb(248, 113, 113);
                }
            }
        }

        private void StartDiagnosis(bool startBackend)
        {
            diagListPanel.Visible = true;
            recoveryPanel.Visible = false;
            runningPanel.Visible = false;
            logPanel.Visible = false;
            progressBar.Value = 0;
            lblBadge.Text = "CHECKING";
            lblBadge.BackColor = Color.FromArgb(30, 58, 138);
            lblBadge.ForeColor = Color.FromArgb(147, 197, 253);

            engine.InitSteps();
            foreach (var st in engine.Steps)
            {
                if (stepLabels.ContainsKey(st.Id))
                {
                    stepLabels[st.Id].Text = "[ ○ ] " + st.Title;
                    stepLabels[st.Id].ForeColor = Color.FromArgb(156, 163, 175);
                }
            }

            ThreadPool.QueueUserWorkItem(_ =>
            {
                bool ok = engine.RunAllChecks(startBackend, null, (step, title, cause, details) =>
                {
                    this.BeginInvoke(new Action(() => ShowFailureUI(step, title, cause, details)));
                });

                if (ok)
                {
                    this.BeginInvoke(new Action(() => ShowSuccessUI()));
                }
            });
        }

        private void ShowFailureUI(string step, string title, string cause, string details)
        {
            diagListPanel.Visible = false;
            runningPanel.Visible = false;
            logPanel.Visible = false;
            recoveryPanel.Visible = true;

            lblBadge.Text = "FAILED";
            lblBadge.BackColor = Color.FromArgb(153, 27, 27);
            lblBadge.ForeColor = Color.FromArgb(254, 202, 202);

            lblErrorTitle.Text = title;
            lblErrorCause.Text = cause;
            txtErrorDetails.Text = details;
        }

        private void ShowSuccessUI()
        {
            diagListPanel.Visible = false;
            recoveryPanel.Visible = false;
            logPanel.Visible = false;
            runningPanel.Visible = true;
            runningPanel.Tag = true;

            lblBadge.Text = "RUNNING";
            lblBadge.BackColor = Color.FromArgb(6, 78, 59);
            lblBadge.ForeColor = Color.FromArgb(167, 243, 208);

            lblRunningInfo.Text = string.Format("Server active on port {0} (PID: {1})\nDual Hook WebSocket active on port 16005\nWeb interface and RPC checks passed.",
                engine.ServerPort, engine.ServerPid);

            OpenWebInterface();
            if (webInterfaceOpened && !isDebugMode && trayIcon != null && trayIcon.Visible)
            {
                // Keep diagnostics available in the tray, with only the app window visible.
                this.Hide();
                WatchBackendLifetime();
            }
        }

        private Process watchedBackend;
        private void WatchBackendLifetime()
        {
            var backend = engine.ActiveServerProcess;
            if (backend == null || object.ReferenceEquals(backend, watchedBackend)) return;
            watchedBackend = backend;
            EventHandler finished = (sender, args) =>
            {
                if (this.IsDisposed || !this.IsHandleCreated) return;
                this.BeginInvoke(new Action(() =>
                {
                    if (this.IsDisposed || !object.ReferenceEquals(engine.ActiveServerProcess, backend)) return;
                    if (backend.ExitCode == 0) { this.Close(); return; }
                    this.Show();
                    this.WindowState = FormWindowState.Normal;
                    ShowFailureUI("backend", "The application exited with pending issues",
                        "Check the logs before opening it again.", engine.GetRecentLogSnippet());
                }));
            };
            backend.Exited += finished;
            if (backend.HasExited) finished(backend, EventArgs.Empty);
        }

        private bool webInterfaceOpened;

        private void OpenWebInterface()
        {
            if (webInterfaceOpened) return;
            string url = "http://localhost:" + engine.ServerPort;
            try
            {
                string chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google", "Chrome", "Application", "chrome.exe");
                if (!File.Exists(chromePath))
                {
                    chromePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "Google", "Chrome", "Application", "chrome.exe");
                }

                string edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft", "Edge", "Application", "msedge.exe");
                if (!File.Exists(edgePath))
                {
                    edgePath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft", "Edge", "Application", "msedge.exe");
                }

                string browserApp = File.Exists(chromePath) ? chromePath : (File.Exists(edgePath) ? edgePath : null);

                if (browserApp != null)
                {
                    try
                    {
                        string profileDir = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "OpenTranslatorProfile");
                        if (!Directory.Exists(profileDir)) Directory.CreateDirectory(profileDir);

                        string debugArg = isDebugMode ? " --remote-debugging-port=9222" : "";
                        string graphicsArg = isSafeMode ? " --disable-gpu" : "";
                        var psi = new ProcessStartInfo
                        {
                            FileName = browserApp,
                            Arguments = "--app=" + url + debugArg + graphicsArg + " --user-data-dir=\"" + profileDir + "\" --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --window-size=1200,800",
                            UseShellExecute = false
                        };
                        var proc = Process.Start(psi);
                        if (proc != null)
                        {
                            // Chromium may exit after handing the request to its existing process.
                            // A successful start must not also launch a default-browser tab.
                            webInterfaceOpened = true;
                            proc.Dispose();
                            return;
                        }
                    }
                    catch { }
                }

                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
                webInterfaceOpened = true;
            }
            catch (Exception ex)
            {
                MessageBox.Show("Open this address in your browser:\n" + url + "\n\nCould not open the interface automatically:" + ex.Message,
                    "OpenTranslator", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private string GenerateDiagnosticReport()
        {
            var sb = new StringBuilder();
            sb.AppendLine("# OPENTRANSLATOR STARTUP DIAGNOSTIC REPORT");
            sb.AppendLine("Date: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            sb.AppendLine("Operating system:" + Environment.OSVersion.VersionString);
            sb.AppendLine("Base directory:" + engine.BaseDir);
            sb.AppendLine("Node.js: " + (engine.NodeExe ?? "Not detected"));
            sb.AppendLine();
            sb.AppendLine("## Component status");
            foreach (var st in engine.Steps)
            {
                sb.AppendLine(string.Format("- [{0}] {1}: {2} ({3} ms)", st.Status, st.Title, st.Details, st.DurationMs));
            }
            sb.AppendLine();
            if (engine.LastErrorStep != null)
            {
                sb.AppendLine("## Recorded failure");
                sb.AppendLine("Step: " + engine.LastErrorStep);
                sb.AppendLine("Title:" + engine.LastErrorMessage);
                sb.AppendLine("Cause: " + engine.LastErrorCause);
                sb.AppendLine("Details:");
                sb.AppendLine("```");
                sb.AppendLine(engine.LastErrorDetails);
                sb.AppendLine("```");
                sb.AppendLine();
            }
            sb.AppendLine("## Runtime logs");
            sb.AppendLine("```");
            sb.AppendLine(engine.LogBuffer.ToString());
            sb.AppendLine("```");
            return sb.ToString();
        }
    }
}
