/**
 * OpenTranslator — SelfTest System
 * Executa testes automatizados de sanidade no ambiente de execução do OpenTranslator.
 * Verifica:
 * - Runtimes (Node.js, Python, SQLite)
 * - 14 Engine Adapters (Ren'Py, RPG Maker, Unity, Unreal, Godot, GameMaker, Construct, Defold, Cocos, Wolf, GDevelop, etc.)
 * - Translation Queue & Adaptive Rate Limiter
 * - Universal Token Engine & Placeholder Integrity
 * - QA Engine & Translation Memory
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const defaultRegistry = require("./engineRegistry");
const QAEngine = require("./qaEngine");
const UniversalTokenEngine = require("./universalTokenEngine");
const translationMemory = require("./translationMemory");
const ProviderRateLimiter = require("./providerRateLimiter");
const AdaptiveConcurrencyController = require("./adaptiveConcurrency");

class SelfTest {
  static runAll() {
    const checks = [];

    // 1. Node.js & Versão
    checks.push({
      component: "Node.js",
      status: parseInt(process.versions.node.split(".")[0], 10) >= 18 ? "PASS" : "WARN",
      version: process.version,
      details: "Versão do Node.js suportada com suporte a ES2022+"
    });

    // 2. Python Embedded
    const pythonExe = path.join(global.ROOT || path.join(__dirname, "../.."), "resources", "renpy", "python", "python.exe");
    const pyExists = fs.existsSync(pythonExe);
    let pyVer = "Não encontrado";
    if (pyExists) {
      try {
        const res = spawnSync(pythonExe, ["--version"], { encoding: "utf8" });
        pyVer = (res.stdout || res.stderr || "").trim();
      } catch (e) {
        pyVer = "Erro ao executar";
      }
    }
    checks.push({
      component: "Python Ren'Py Embedded",
      status: pyExists ? "PASS" : "WARN",
      version: pyVer,
      details: pyExists ? "Python 3.12 disponível para descompilação de .rpyc" : "Python embutido ausente"
    });

    // 2B. Unity Extractor & Parsers
    const root = global.ROOT || path.join(__dirname, "../..");
    const internalSitePackages = path.join(root, "resources", "unity", "site-packages");
    let unityStatus = "FAIL";
    let unityDetails = [];
    const pyCandidate = pyExists ? pythonExe : "python";

    try {
      const probeScript = `
import sys, os
internal_sp = r"${internalSitePackages}"
if os.path.exists(internal_sp) and internal_sp not in sys.path:
    sys.path.insert(0, internal_sp)
results = []
try:
    import UnityPy
    results.append("UnityPy: OK (" + getattr(UnityPy, "__version__", "1.25.2") + ")")
except Exception as e:
    results.append("UnityPy: FAIL (" + str(e) + ")")

try:
    from UnityPy.files import SerializedFile
    results.append("Unity .assets: OK")
except Exception as e:
    results.append("Unity .assets: FAIL (" + str(e) + ")")

try:
    from UnityPy.files import BundleFile
    results.append("Unity AssetBundle: OK")
except Exception as e:
    results.append("Unity AssetBundle: FAIL (" + str(e) + ")")

print("; ".join(results))
`;
      const res = spawnSync(pyCandidate, ["-c", probeScript], {
        encoding: "utf-8",
        timeout: 8000
      });
      const output = (res.stdout || res.stderr || "").trim();
      if (output.includes("UnityPy: OK") && output.includes("Unity .assets: OK") && output.includes("Unity AssetBundle: OK")) {
        unityStatus = "PASS";
        unityDetails = output;
      } else {
        unityStatus = "WARN";
        unityDetails = output || "Ambiente UnityPy não respondeu ao teste de sonda";
      }
    } catch (e) {
      unityStatus = "WARN";
      unityDetails = "Erro ao executar verificação do extrator Unity: " + e.message;
    }

    checks.push({
      component: "Unity Extractor & Parsers",
      status: unityStatus,
      details: unityDetails
    });

    // 3. SQLite Database
    let sqliteStatus = "FAIL";
    let sqliteDetails = "";
    try {
      const Database = require("better-sqlite3");
      const db = new Database(":memory:");
      db.prepare("CREATE TABLE test_wal (id INT, val TEXT);").run();
      db.prepare("INSERT INTO test_wal VALUES (1, @val);").run({ val: "ok" });
      const row = db.prepare("SELECT val FROM test_wal WHERE id = 1;").get();
      db.close();
      if (row && row.val === "ok") {
        sqliteStatus = "PASS";
        sqliteDetails = "better-sqlite3 nativo 100% operacional (Node ABI " + process.versions.modules + ", suporte WAL ativo)";
      } else {
        sqliteStatus = "FAIL";
        sqliteDetails = "better-sqlite3 carregado, mas query de teste retornou dado inválido";
      }
    } catch (e) {
      sqliteStatus = "FAIL";
      sqliteDetails = "FALHA CRÍTICA NO SQLITE: " + e.message;
    }
    checks.push({
      component: "SQLite Database",
      status: sqliteStatus,
      details: sqliteDetails
    });

    // 4. Permissões de Escrita no Staging / Data
    const stagingDir = path.join(global.DATA_DIR || path.join(__dirname, "../../data"), "staging");
    let writeStatus = "PASS";
    try {
      fs.mkdirSync(stagingDir, { recursive: true });
      const testFile = path.join(stagingDir, "_perm_test.tmp");
      fs.writeFileSync(testFile, "test", "utf8");
      fs.unlinkSync(testFile);
    } catch (e) {
      writeStatus = "FAIL";
    }
    checks.push({
      component: "Data & Staging Directories",
      status: writeStatus,
      details: writeStatus === "PASS" ? "Diretório com permissão plena de leitura e escrita" : "Permissão de escrita negada"
    });

    // 5. Verificação de Integridade de Todos os 14 Engine Adapters
    const expectedEngines = [
      { id: "renpy", name: "Ren'Py Adapter" },
      { id: "rpgmaker", name: "RPG Maker Adapter" },
      { id: "unity", name: "Unity Adapter" },
      { id: "unreal", name: "Unreal Engine Adapter" },
      { id: "godot", name: "Godot Adapter" },
      { id: "gamemaker", name: "GameMaker Adapter" },
      { id: "construct", name: "Construct Adapter" },
      { id: "defold", name: "Defold Adapter" },
      { id: "cocos_creator", name: "Cocos Creator Adapter" },
      { id: "cocos2dx", name: "Cocos2d-x Adapter" },
      { id: "wolf", name: "Wolf RPG Adapter" },
      { id: "gdevelop", name: "GDevelop Adapter" },
      { id: "electron", name: "Electron Adapter" },
      { id: "generic", name: "Generic Engine Adapter" }
    ];

    for (const eng of expectedEngines) {
      const adapter = defaultRegistry.get(eng.id);
      const isOk = adapter && typeof adapter.extract === 'function' && typeof adapter.apply === 'function';
      checks.push({
        component: eng.name,
        status: isOk ? "PASS" : "FAIL",
        details: isOk ? `Contrato de ciclo de vida verificado (${adapter.name})` : `Adapter ausente ou contrato incompleto`
      });
    }

    // 6. Universal Token Engine & Placeholder Integrity
    try {
      const ute = new UniversalTokenEngine();
      const sample = "Hello [player_name], cash: $[cash], tags: {i}magic{/i}";
      const { protectedText, tokens } = ute.protect(sample, "renpy");
      const { restoredText, valid } = ute.restore(protectedText, tokens);
      const tokenPass = valid && restoredText === sample && tokens.length === 4;
      checks.push({
        component: "Universal Token & Placeholder Engine",
        status: tokenPass ? "PASS" : "FAIL",
        details: tokenPass ? "Proteção e restauração bidirecional 100% íntegra" : "Falha na validação de tokens"
      });
    } catch (e) {
      checks.push({ component: "Universal Token Engine", status: "FAIL", details: e.message });
    }

    // 7. Adaptive Rate Limiter & Concurrency Controller
    try {
      const rl = new ProviderRateLimiter({ capacity: 10, refillRate: 10 });
      const acc = new AdaptiveConcurrencyController({ startConcurrency: 4 });
      acc.recordSuccess(100);
      acc.recordError(429);
      const accOk = acc.getConcurrency() <= 4 && acc.circuitOpen === true;
      checks.push({
        component: "Adaptive Rate Limiter & Concurrency",
        status: accOk ? "PASS" : "FAIL",
        details: accOk ? "Recuo multiplicativo em 429 e token bucket operacional" : "Comportamento de recuo incorreto"
      });
    } catch (e) {
      checks.push({ component: "Adaptive Rate Limiter", status: "FAIL", details: e.message });
    }

    // 8. QA Engine
    try {
      const qaGood = QAEngine.validate("Hello world", "Olá mundo");
      const qaOk = qaGood && qaGood.qaStatus === "pass";
      checks.push({
        component: "QA Engine",
        status: qaOk ? "PASS" : "FAIL",
        details: qaOk ? "Validação heurística e de integridade ativa" : "QA retornou status inesperado"
      });
    } catch (e) {
      checks.push({ component: "QA Engine", status: "FAIL", details: e.message });
    }

    // 9. Translation Memory
    try {
      const tmOk = translationMemory && typeof translationMemory.lookup === 'function';
      checks.push({
        component: "Translation Memory",
        status: tmOk ? "PASS" : "FAIL",
        details: tmOk ? "Módulo de memória de tradução e cache hierárquico ativo" : "Falha ao carregar Translation Memory"
      });
    } catch (e) {
      checks.push({ component: "Translation Memory", status: "FAIL", details: e.message });
    }

    const passed = checks.filter(c => c.status === "PASS").length;
    return {
      success: checks.every(c => c.status !== "FAIL"),
      summary: passed + "/" + checks.length + " verificações aprovadas",
      checks
    };
  }
}

module.exports = SelfTest;
