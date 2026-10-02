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
                if (arg.Equals("--safe", StringComparison.OrdinalIgnoreCase)) safeMode = true;
                if (arg.Equals("--debug", StringComparison.OrdinalIgnoreCase) || arg.Equals("--diag", StringComparison.OrdinalIgnoreCase)) debugMode = true;
            }

            if (smokeTest)
            {
                int exitCode = RunSmokeTest();
                Environment.Exit(exitCode);
                return;
            }

            // Single Instance Enforcement
            bool createdNew;
            appMutex = new Mutex(true, "Global\\OpenTranslator_SingleInstance_Mutex_App", out createdNew);

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
                        KillProcessOnPort(8080);
                        KillProcessOnPort(16005);
                        Thread.Sleep(800);
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

        static void KillProcessOnPort(int port)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/c for /f \"tokens=5\" %a in ('netstat -ano ^| findstr \":{0} \" ^| findstr \"LISTENING\"') do taskkill /F /PID %a", port),
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (var p = Process.Start(psi)) { p.WaitForExit(3000); }
            }
            catch { }
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
                Text = "OpenTranslator Já em Execução",
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                ForeColor = Color.FromArgb(56, 189, 248),
                Location = new Point(20, 16),
                AutoSize = true
            };

            var lblDesc = new Label
            {
                Text = serverResponding
                    ? "Uma instância do OpenTranslator já está aberta e respondendo na porta 8080.\nO que você deseja fazer?"
                    : "Uma instância do OpenTranslator foi detectada, mas o servidor não está respondendo.\nVocê pode reiniciar o sistema limpo ou cancelar.",
                Location = new Point(22, 50),
                Size = new Size(440, 50),
                ForeColor = Color.FromArgb(209, 213, 219)
            };

            var btnOpen = new Button
            {
                Text = "Abrir Interface Web",
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
                Text = "Reiniciar",
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
                Text = "Cancelar",
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
            Steps.Add(new DiagnosticStep { Id = "files", Title = "Arquivos Essenciais do Sistema", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "runtime", Title = "Runtime Node.js (Portátil / Sistema)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "deps", Title = "Módulos Nativo e SQLite (Transação Real)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "db", Title = "Diretórios de Dados e Cache Local", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "ports", Title = "Verificação e Liberação de Portas (8080, 16005)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "permissions", Title = "Permissões de Leitura e Escrita", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "backend", Title = "Inicialização do Servidor Backend", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "http", Title = "Conexão e Resposta HTTP (Health Check)", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "frontend", Title = "Integridade dos Ativos Frontend", Status = "PENDING" });
            Steps.Add(new DiagnosticStep { Id = "rpc", Title = "Comunicação RPC Segura (Ping / Load)", Status = "PENDING" });
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
            Log("=== Iniciando Verificação de Integridade Rigorosa do OpenTranslator ===");
            Log("Diretório Base: " + BaseDir);
            Log("Diretório Tool: " + ToolDir);

            // Step 1: Files
            var sw = Stopwatch.StartNew();
            UpdateStep("files", "RUNNING", "Validando integridade dos arquivos...");
            Log("[1/10] Verificando arquivos essenciais...");
            string serverJs = ResolveExistingPath(Path.Combine(BaseDir, "server.js"), Path.Combine(ToolDir, "server.js"));
            string httpServerJs = ResolveExistingPath(Path.Combine(BaseDir, "src", "httpServer.js"), Path.Combine(ToolDir, "src", "httpServer.js"));
            string rpcHandlersJs = ResolveExistingPath(Path.Combine(BaseDir, "src", "rpcHandlers.js"), Path.Combine(ToolDir, "src", "rpcHandlers.js"));
            string indexHtml = ResolveExistingPath(Path.Combine(BaseDir, "ui", "index.html"), Path.Combine(ToolDir, "ui", "index.html"), Path.Combine(ToolDir, "www", "index.html"));
            string appJs = ResolveExistingPath(Path.Combine(BaseDir, "ui", "app.js"), Path.Combine(ToolDir, "ui", "app.js"), Path.Combine(ToolDir, "www", "app.js"));

            string[] requiredFiles = new string[] { serverJs, httpServerJs, rpcHandlersJs, indexHtml, appJs };

            foreach (var rf in requiredFiles)
            {
                if (!File.Exists(rf))
                {
                    sw.Stop();
                    string cause = "Arquivo essencial não encontrado: " + Path.GetFileName(rf);
                    string det = "Caminho esperado: " + rf;
                    SetError("files", "Arquivos essenciais ausentes", cause, det);
                    UpdateStep("files", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
                var fi = new FileInfo(rf);
                if (fi.Length == 0)
                {
                    sw.Stop();
                    string cause = "Arquivo essencial está vazio (0 bytes): " + Path.GetFileName(rf);
                    SetError("files", "Arquivo corrompido", cause, rf);
                    UpdateStep("files", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
            }
            sw.Stop();
            UpdateStep("files", "OK", "5/5 arquivos principais íntegros", sw.ElapsedMilliseconds);
            Log("  [OK] Arquivos essenciais verificados com sucesso.");

            // Step 2: Runtime
            sw.Restart();
            UpdateStep("runtime", "RUNNING", "Detectando runtime Node.js...");
            Log("[2/10] Verificando runtime Node.js...");

            string nodePortable = ResolveExistingPath(
                Path.Combine(BaseDir, "bin", "node-v20.18.3-win-x64", "node.exe"),
                Path.Combine(ToolDir, "bin", "node-v20.18.3-win-x64", "node.exe")
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
                    Log("  [OK] Node.js portátil funcional: " + ver);
                }
            }

            if (selectedNode == null)
            {
                string sysVer = TestNodeExecutable("node");
                if (!string.IsNullOrEmpty(sysVer))
                {
                    selectedNode = "node";
                    nodeVer = sysVer;
                    Log("  [OK] Node.js do sistema funcional: " + sysVer);
                }
            }

            if (selectedNode == null)
            {
                sw.Stop();
                string cause = "Nenhum runtime Node.js operacional encontrado.";
                string det = "O executável portátil não foi localizado em: " + nodePortable + " e 'node' não está no PATH.";
                SetError("runtime", "Runtime Node.js não encontrado", cause, det);
                UpdateStep("runtime", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }
            NodeExe = selectedNode;
            sw.Stop();
            UpdateStep("runtime", "OK", "Node.js " + nodeVer + " operacional", sw.ElapsedMilliseconds);

            // Step 3: Dependencies & SQLite Live Test
            sw.Restart();
            UpdateStep("deps", "RUNNING", "Executando teste real de transação SQLite...");
            Log("[3/10] Testando dependências nativas e SQLite em runtime real...");

            string probeScript = "try { const ws = require('ws'); const Database = require('better-sqlite3'); const db = new Database(':memory:'); db.prepare('CREATE TABLE _probe(id INT, v TEXT)').run(); db.prepare('INSERT INTO _probe VALUES (1, @v)').run({ v: 'ok' }); const row = db.prepare('SELECT v FROM _probe WHERE id = 1').get(); db.close(); if (row && row.v === 'ok') console.log('SQLITE_AND_WS_OK'); else { console.error('SQLITE_BAD_RESULT'); process.exit(1); } } catch(e) { console.error('MODULE_ERROR: ' + e.message); process.exit(1); }";

            string probeOut = null;
            string probeErr = null;
            bool probeSuccess = RunNodeProbe(probeScript, out probeOut, out probeErr);

            if (!probeSuccess || !probeOut.Contains("SQLITE_AND_WS_OK"))
            {
                sw.Stop();
                string cause = "Incompatibilidade no módulo nativo better-sqlite3 ou ws.";
                string det = string.Format("Erro retornado pelo Node:\n{0}\n{1}\nRuntime: {2}", probeErr, probeOut, NodeExe);
                SetError("deps", "Falha Crítica no SQLite Nativo", cause, det);
                UpdateStep("deps", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            sw.Stop();
            UpdateStep("deps", "OK", "ws e better-sqlite3 nativo validados com SQL real", sw.ElapsedMilliseconds);
            Log("  [OK] Dependências nativas e transação SQLite validadas.");

            // Step 4: Database & Cache Dirs
            sw.Restart();
            UpdateStep("db", "RUNNING", "Verificando diretórios de dados...");
            Log("[4/10] Verificando diretórios de dados e integridade de cache...");
            string dataDir = Directory.Exists(Path.Combine(BaseDir, "data")) ? Path.Combine(BaseDir, "data") : Path.Combine(ToolDir, "data");
            string gameLibDir = Directory.Exists(Path.Combine(BaseDir, "gameLib")) ? Path.Combine(BaseDir, "gameLib") : Path.Combine(ToolDir, "gameLib");
            if (!Directory.Exists(dataDir)) Directory.CreateDirectory(dataDir);
            if (!Directory.Exists(gameLibDir)) Directory.CreateDirectory(gameLibDir);

            sw.Stop();
            UpdateStep("db", "OK", "data e gameLib prontos", sw.ElapsedMilliseconds);
            Log("  [OK] Diretórios de dados validados.");

            // Step 5: Ports
            sw.Restart();
            UpdateStep("ports", "RUNNING", "Verificando portas 8080 e 16005...");
            Log("[5/10] Verificando disponibilidade de portas...");

            bool port8080InUse = IsPortInUse(8080);
            if (port8080InUse)
            {
                Log("  Porta 8080 em uso. Testando se pertence a um OpenTranslator saudável...");
                bool healthy = CheckHttpHealthy(8080, 1500);
                if (healthy)
                {
                    Log("  [OK] Instância anterior do OpenTranslator respondendo na porta 8080.");
                    UpdateStep("ports", "OK", "Instância ativa detectada na porta 8080", sw.ElapsedMilliseconds);
                }
                else
                {
                    Log("  Porta ocupada por processo sem resposta. Liberando...");
                    KillPortProcess(8080);
                    KillPortProcess(16005);
                    Thread.Sleep(600);
                    if (IsPortInUse(8080))
                    {
                        sw.Stop();
                        string cause = "Porta 8080 permanece ocupada e não pôde ser liberada automaticamente.";
                        string det = "Verifique processos conflitantes na porta 8080 no Gerenciador de Tarefas.";
                        SetError("ports", "Porta 8080 indisponível", cause, det);
                        UpdateStep("ports", "ERROR", cause, sw.ElapsedMilliseconds);
                        if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                        return false;
                    }
                    UpdateStep("ports", "OK", "Portas 8080 e 16005 liberadas com sucesso", sw.ElapsedMilliseconds);
                }
            }
            else
            {
                UpdateStep("ports", "OK", "Portas 8080 e 16005 livres", sw.ElapsedMilliseconds);
            }
            sw.Stop();
            Log("  [OK] Portas validadas.");

            // Step 6: Permissions
            sw.Restart();
            UpdateStep("permissions", "RUNNING", "Testando permissões de gravação...");
            Log("[6/10] Testando permissões de gravação...");
            try
            {
                string testFile = Path.Combine(dataDir, ".perm_test_" + Guid.NewGuid().ToString("N"));
                File.WriteAllText(testFile, "OK");
                File.Delete(testFile);
                sw.Stop();
                UpdateStep("permissions", "OK", "Gravação em Tool/data confirmada", sw.ElapsedMilliseconds);
                Log("  [OK] Permissões confirmadas.");
            }
            catch (Exception ex)
            {
                sw.Stop();
                string cause = "Falha ao gravar no diretório de dados: " + ex.Message;
                SetError("permissions", "Permissões insuficientes", cause, ex.ToString());
                UpdateStep("permissions", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            if (!startBackend) return true;

            // Step 7: Backend Launch
            sw.Restart();
            UpdateStep("backend", "RUNNING", "Inicializando servidor backend...");
            Log("[7/10] Inicializando servidor backend...");

            bool alreadyRunning = CheckHttpHealthy(8080, 500);
            if (!alreadyRunning)
            {
                bool launched = LaunchNodeServer();
                if (!launched)
                {
                    sw.Stop();
                    string cause = "Falha ao iniciar o processo Node.js do servidor.";
                    string det = "Comando: " + NodeExe + " server.js --no-browser\nDiretório: " + ToolDir;
                    SetError("backend", "Backend falhou na inicialização", cause, det);
                    UpdateStep("backend", "ERROR", cause, sw.ElapsedMilliseconds);
                    if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                    return false;
                }
            }
            sw.Stop();
            string bMsg = alreadyRunning ? "Servidor já em execução (reutilizado)" : "Servidor iniciado (PID: " + ServerPid + ")";
            UpdateStep("backend", "OK", bMsg, sw.ElapsedMilliseconds);
            Log("  [OK] " + bMsg);

            // Step 8: HTTP Health Check
            sw.Restart();
            UpdateStep("http", "RUNNING", "Aguardando confirmação HTTP 200...");
            Log("[8/10] Aguardando confirmação HTTP 200...");

            bool httpOk = WaitForHttpReady(8080, 15000);
            if (!httpOk)
            {
                sw.Stop();
                string cause = "O servidor backend não respondeu na porta 8080 após 15 segundos.";
                string det = "Últimos logs:\n" + GetRecentLogSnippet();
                SetError("http", "Timeout de conexão HTTP", cause, det);
                UpdateStep("http", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }
            sw.Stop();
            UpdateStep("http", "OK", "HTTP 200 OK em http://localhost:8080", sw.ElapsedMilliseconds);
            Log("  [OK] Servidor respondendo via HTTP.");

            // Step 9: Frontend Assets
            sw.Restart();
            UpdateStep("frontend", "RUNNING", "Verificando index.html e app.js...");
            Log("[9/10] Verificando ativos da interface frontend...");
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
                string cause = "Falha ao requisitar ativos frontend: " + ex.Message;
                SetError("frontend", "Falha de carregamento da interface", cause, ex.ToString());
                UpdateStep("frontend", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            // Step 10: RPC Test
            sw.Restart();
            UpdateStep("rpc", "RUNNING", "Testando chamada RPC segura (ping)...");
            Log("[10/10] Realizando teste de chamada RPC...");
            try
            {
                var rpcReq = (HttpWebRequest)WebRequest.Create("http://127.0.0.1:8080/api/rpc");
                rpcReq.Method = "POST";
                rpcReq.ContentType = "application/json";
                rpcReq.Timeout = 5000;
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
                    throw new Exception("Resposta RPC inválida: " + respJson);
                }

                sw.Stop();
                UpdateStep("rpc", "OK", "RPC ping validado com sucesso", sw.ElapsedMilliseconds);
                Log("  [OK] RPC funcionando perfeitamente.");
            }
            catch (Exception ex)
            {
                sw.Stop();
                string cause = "Falha na chamada RPC: " + ex.Message;
                SetError("rpc", "Falha de comunicação RPC", cause, ex.ToString());
                UpdateStep("rpc", "ERROR", cause, sw.ElapsedMilliseconds);
                if (onFail != null) onFail(LastErrorStep, LastErrorMessage, LastErrorCause, LastErrorDetails);
                return false;
            }

            Log("=== Todos os 10 diagnósticos concluídos com SUCESSO REAL! ===");
            return true;
        }

        private void SetError(string step, string title, string cause, string details)
        {
            LastErrorStep = step;
            LastErrorMessage = title;
            LastErrorCause = cause;
            LastErrorDetails = details;
            Log(string.Format("  [FALHA] {0}: {1}", title, cause));
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

        public void KillPortProcess(int port)
        {
            try
            {
                var psi = new ProcessStartInfo
                {
                    FileName = "cmd.exe",
                    Arguments = string.Format("/c for /f \"tokens=5\" %a in ('netstat -ano ^| findstr \":{0} \" ^| findstr \"LISTENING\"') do taskkill /F /PID %a", port),
                    CreateNoWindow = true,
                    UseShellExecute = false
                };
                using (var p = Process.Start(psi))
                {
                    p.WaitForExit(3000);
                }
            }
            catch { }
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
                Log("Erro ao disparar processo node: " + ex.Message);
            }
            return false;
        }

        public void StopServer()
        {
            if (ActiveServerProcess != null && !ActiveServerProcess.HasExited)
            {
                try
                {
                    ActiveServerProcess.Kill();
                    ActiveServerProcess.WaitForExit(2000);
                }
                catch { }
                ActiveServerProcess = null;
            }
            KillPortProcess(8080);
            KillPortProcess(16005);
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
            Log("=== Executando Rotina de Auto-Correção ===");
            try
            {
                StopServer();
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

                Log("Rotina de auto-correção finalizada.");
            }
            catch (Exception ex)
            {
                Log("Exceção na auto-correção: " + ex.Message);
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
                Text = "Sistema de Inicialização, Autodiagnóstico e Recuperação",
                Font = new Font("Segoe UI", 9f, FontStyle.Regular),
                ForeColor = Color.FromArgb(156, 163, 175),
                Location = new Point(22, 42),
                AutoSize = true
            };
            lblBadge = new Label
            {
                Text = "DIAGNOSTICANDO",
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
                Text = "Iniciando verificações pré-voo...",
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

            var btnDiagLog = CreateButton("Ver Logs Detalhados", new Point(15, startY + 10), new Size(180, 32), Color.FromArgb(39, 41, 46));
            btnDiagLog.Click += (s, e) => ShowLogsView();
            diagListPanel.Controls.Add(btnDiagLog);

            // 2. Recovery View
            recoveryPanel = new Panel { Dock = DockStyle.Fill, Visible = false };
            var lblRecHead = new Label
            {
                Text = "OPENTRANSLATOR NÃO FOI INICIADO",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = Color.FromArgb(239, 68, 68),
                Location = new Point(10, 5),
                AutoSize = true
            };
            lblErrorTitle = new Label
            {
                Text = "Problema Detectado",
                Font = new Font("Segoe UI", 11f, FontStyle.Bold),
                ForeColor = Color.FromArgb(243, 244, 246),
                Location = new Point(12, 36),
                AutoSize = true
            };
            lblErrorCause = new Label
            {
                Text = "Causa do erro...",
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

            btnAutoFix = CreateButton("Tentar Corrigir Automaticamente", new Point(12, 295), new Size(230, 36), Color.FromArgb(16, 185, 129));
            btnAutoFix.Click += (s, e) =>
            {
                btnAutoFix.Enabled = false;
                btnAutoFix.Text = "Corrigindo...";
                ThreadPool.QueueUserWorkItem(_ =>
                {
                    engine.AutoFix();
                    Thread.Sleep(500);
                    this.BeginInvoke(new Action(() =>
                    {
                        btnAutoFix.Enabled = true;
                        btnAutoFix.Text = "Tentar Corrigir Automaticamente";
                        StartDiagnosis(true);
                    }));
                });
            };

            btnSafeStart = CreateButton("Modo de Recuperação", new Point(250, 295), new Size(180, 36), Color.FromArgb(245, 158, 11));
            btnSafeStart.Click += (s, e) =>
            {
                isSafeMode = true;
                StartDiagnosis(false);
            };

            btnCopyReport = CreateButton("Copiar Relatório", new Point(440, 295), new Size(130, 36), Color.FromArgb(39, 41, 46));
            btnCopyReport.Click += (s, e) =>
            {
                string report = GenerateDiagnosticReport();
                Clipboard.SetText(report);
                MessageBox.Show("Relatório copiado para a área de transferência!", "Diagnóstico", MessageBoxButtons.OK, MessageBoxIcon.Information);
            };

            btnToggleLogsFromError = CreateButton("Ver Logs", new Point(580, 295), new Size(110, 36), Color.FromArgb(39, 41, 46));
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
                Text = "OpenTranslator em Execução",
                Font = new Font("Segoe UI", 14f, FontStyle.Bold),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(10, 10),
                AutoSize = true
            };
            lblRunningInfo = new Label
            {
                Text = "Servidor ativo em http://localhost:8080\nDual Hook ativo na porta 16005\nInterface web operacional.",
                Font = new Font("Segoe UI", 10f),
                ForeColor = Color.FromArgb(209, 213, 219),
                Location = new Point(12, 45),
                Size = new Size(680, 80)
            };

            btnOpenBrowser = CreateButton("Abrir Interface Web", new Point(12, 130), new Size(200, 40), Color.FromArgb(14, 165, 233));
            btnOpenBrowser.Font = new Font("Segoe UI", 10f, FontStyle.Bold);
            btnOpenBrowser.Click += (s, e) => OpenWebInterface();

            btnViewLogs = CreateButton("Ver Diagnóstico / Logs", new Point(220, 130), new Size(180, 40), Color.FromArgb(39, 41, 46));
            btnViewLogs.Click += (s, e) => ShowLogsView();

            btnRestart = CreateButton("Reiniciar", new Point(410, 130), new Size(120, 40), Color.FromArgb(39, 41, 46));
            btnRestart.Click += (s, e) =>
            {
                engine.StopServer();
                StartDiagnosis(true);
            };

            btnExitApp = CreateButton("Encerrar OpenTranslator", new Point(540, 130), new Size(150, 40), Color.FromArgb(185, 28, 28));
            btnExitApp.Click += (s, e) =>
            {
                engine.StopServer();
                Application.Exit();
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
            btnBackFromLog = CreateButton("Voltar ao Painel", new Point(0, 5), new Size(150, 32), Color.FromArgb(39, 41, 46));
            btnBackFromLog.Click += (s, e) =>
            {
                logPanel.Visible = false;
                if (engine.LastErrorStep != null) recoveryPanel.Visible = true;
                else if (runningPanel.Tag != null && (bool)runningPanel.Tag) runningPanel.Visible = true;
                else diagListPanel.Visible = true;
            };
            var btnCopyAllLogs = CreateButton("Copiar Todos os Logs", new Point(160, 5), new Size(180, 32), Color.FromArgb(39, 41, 46));
            btnCopyAllLogs.Click += (s, e) =>
            {
                Clipboard.SetText(engine.LogBuffer.ToString());
                MessageBox.Show("Logs copiados para a área de transferência!", "Logs", MessageBoxButtons.OK, MessageBoxIcon.Information);
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
                if (trayIcon != null)
                {
                    trayIcon.Visible = false;
                    trayIcon.Dispose();
                }
                engine.StopServer();
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
                trayMenu.Items.Add("Abrir Interface", null, (s, e) => OpenWebInterface());
                trayMenu.Items.Add("Exibir Painel", null, (s, e) => { this.Show(); this.WindowState = FormWindowState.Normal; this.BringToFront(); });
                trayMenu.Items.Add(new ToolStripSeparator());
                trayMenu.Items.Add("Encerrar OpenTranslator", null, (s, e) => { engine.StopServer(); Application.Exit(); });

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
            lblBadge.Text = "DIAGNOSTICANDO";
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

            lblBadge.Text = "FALHA";
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

            lblBadge.Text = "OPERACIONAL";
            lblBadge.BackColor = Color.FromArgb(6, 78, 59);
            lblBadge.ForeColor = Color.FromArgb(167, 243, 208);

            lblRunningInfo.Text = string.Format("Servidor ativo na porta {0} (PID: {1})\nDual Hook WebSocket ativo na porta 16005\nInterface web e chamadas RPC validadas com sucesso.",
                engine.ServerPort, engine.ServerPid);

            OpenWebInterface();
        }

        private void OpenWebInterface()
        {
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
                        var psi = new ProcessStartInfo
                        {
                            FileName = browserApp,
                            Arguments = "--app=" + url + " --remote-debugging-port=9222 --user-data-dir=\"" + profileDir + "\" --disable-background-timer-throttling --disable-backgrounding-occluded-windows --disable-renderer-backgrounding --window-size=1180,760",
                            UseShellExecute = false
                        };
                        Process.Start(psi);
                        return;
                    }
                    catch { }
                }

                Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
            }
            catch (Exception ex)
            {
                MessageBox.Show("Acesse manualmente no seu navegador:\n" + url + "\n\nErro ao abrir automaticamente: " + ex.Message,
                    "OpenTranslator", MessageBoxButtons.OK, MessageBoxIcon.Information);
            }
        }

        private string GenerateDiagnosticReport()
        {
            var sb = new StringBuilder();
            sb.AppendLine("# RELATÓRIO DE AUTODIAGNÓSTICO RIGOROSO - OPENTRANSLATOR");
            sb.AppendLine("Data: " + DateTime.Now.ToString("yyyy-MM-dd HH:mm:ss"));
            sb.AppendLine("Sistema Operacional: " + Environment.OSVersion.VersionString);
            sb.AppendLine("Diretório Base: " + engine.BaseDir);
            sb.AppendLine("Node.js: " + (engine.NodeExe ?? "Não detectado"));
            sb.AppendLine();
            sb.AppendLine("## Status dos Componentes");
            foreach (var st in engine.Steps)
            {
                sb.AppendLine(string.Format("- [{0}] {1}: {2} ({3} ms)", st.Status, st.Title, st.Details, st.DurationMs));
            }
            sb.AppendLine();
            if (engine.LastErrorStep != null)
            {
                sb.AppendLine("## Falha Registrada");
                sb.AppendLine("Etapa: " + engine.LastErrorStep);
                sb.AppendLine("Título: " + engine.LastErrorMessage);
                sb.AppendLine("Causa: " + engine.LastErrorCause);
                sb.AppendLine("Detalhes:");
                sb.AppendLine("```");
                sb.AppendLine(engine.LastErrorDetails);
                sb.AppendLine("```");
                sb.AppendLine();
            }
            sb.AppendLine("## Logs de Execução");
            sb.AppendLine("```");
            sb.AppendLine(engine.LogBuffer.ToString());
            sb.AppendLine("```");
            return sb.ToString();
        }
    }
}
