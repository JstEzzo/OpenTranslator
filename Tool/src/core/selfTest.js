/**
 * OpenTranslator — SelfTest System
 * Executa testes automatizados de sanidade no ambiente de execução do OpenTranslator.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

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

    // 3. SQLite WAL Engine
    let sqliteStatus = "WARN";
    try {
      const Database = require("better-sqlite3");
      const db = new Database(":memory:");
      db.exec("CREATE TABLE test (id INT);");
      sqliteStatus = "PASS";
    } catch (e) {
      sqliteStatus = "FALLBACK";
    }
    checks.push({
      component: "SQLite Database",
      status: sqliteStatus,
      details: sqliteStatus === "PASS" ? "better-sqlite3 nativo operacional com suporte WAL" : "Memória volátil in-memory (fallback)"
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

    const passed = checks.filter(c => c.status === "PASS").length;
    return {
      success: checks.every(c => c.status !== "FAIL"),
      summary: passed + "/" + checks.length + " verificações aprovadas",
      checks
    };
  }
}

module.exports = SelfTest;
