const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const BaseMediaExtractor = require("./BaseMediaExtractor");

class UnityMediaExtractor extends BaseMediaExtractor {
  constructor() {
    super("unity");
  }

  getPythonExecutionConfig() {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    const internalSitePackages = [
      path.resolve(__dirname, "../../resources/unity/site-packages"),
      path.resolve(__dirname, "../../../resources/unity/site-packages"),
      path.join(root, "resources", "unity", "site-packages"),
      path.join(root, "Tool", "resources", "unity", "site-packages")
    ].find(p => fs.existsSync(p));

    const embeddedPy = [
      path.resolve(__dirname, "../../resources/renpy/python/python.exe"),
      path.resolve(__dirname, "../../../resources/renpy/python/python.exe"),
      path.join(root, "resources", "renpy", "python", "python.exe"),
      path.join(root, "Tool", "resources", "renpy", "python", "python.exe")
    ].find(p => fs.existsSync(p));

    // Priority 1: Portable embedded Python + internal vendor site-packages
    if (embeddedPy && fs.existsSync(internalSitePackages)) {
      try {
        const testRes = spawnSync(embeddedPy, [
          "-c",
          `import sys; sys.path.insert(0, r"${internalSitePackages}"); import UnityPy; print("OK")`
        ], { encoding: "utf-8", timeout: 5000 });
        if (testRes.status === 0 && (testRes.stdout || "").includes("OK")) {
          return {
            pythonExe: embeddedPy,
            env: {
              ...process.env,
              PYTHONPATH: internalSitePackages + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : "")
            },
            type: "internal_portable",
            sitePackages: internalSitePackages
          };
        }
      } catch (e) {}
    }

    // Priority 2: Internal vendor site-packages with system Python
    if (fs.existsSync(internalSitePackages)) {
      try {
        const testRes = spawnSync("python", [
          "-c",
          `import sys; sys.path.insert(0, r"${internalSitePackages}"); import UnityPy; print("OK")`
        ], { encoding: "utf-8", timeout: 5000 });
        if (testRes.status === 0 && (testRes.stdout || "").includes("OK")) {
          return {
            pythonExe: "python",
            env: {
              ...process.env,
              PYTHONPATH: internalSitePackages + (process.env.PYTHONPATH ? path.delimiter + process.env.PYTHONPATH : "")
            },
            type: "internal_site_packages",
            sitePackages: internalSitePackages
          };
        }
      } catch (e) {}
    }

    // Priority 3: System Python with global UnityPy
    try {
      const testRes = spawnSync("python", ["-c", "import UnityPy; print('OK')"], { encoding: "utf-8", timeout: 5000 });
      if (testRes.status === 0 && (testRes.stdout || "").includes("OK")) {
        return {
          pythonExe: "python",
          env: process.env,
          type: "system_python"
        };
      }
    } catch (e) {}

    // Not available in any environment
    return null;
  }

  async extract({ gameDir, destDir, type = "img" }) {
    const ignoredDirs = new Set(["mono", "monobleedingedge", ".git", ".vs"]);
    
    // 1. Scan loose files (StreamingAssets, loose media/data)
    const loose = this.scanLooseFiles(gameDir, destDir, type, ignoredDirs);
    let totalFound = loose.totalFound;
    let extractedCount = loose.extractedCount;
    let duplicatesCount = loose.duplicatesCount || 0;
    let collisionsCount = loose.collisionsCount || 0;
    let ignoredCount = loose.ignoredCount;
    let allErrors = [...loose.errors];
    const sources = [];

    if (loose.extractedCount > 0 || loose.duplicatesCount > 0) {
      const label = type === "all" ? "arquivos soltos Unity" : "mídia solta Unity";
      sources.push(`${label} (${loose.extractedCount} novos${loose.duplicatesCount > 0 ? `, ${loose.duplicatesCount} já existentes` : ""})`);
    }

    // 2. Check if packaged assets (.assets, .bundle) exist in gameDir
    let hasPackagedAssets = false;
    const checkPackaged = (dir, depth = 0) => {
      if (depth > 4 || hasPackagedAssets) return;
      try {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
          if (item.isDirectory()) {
            if (!ignoredDirs.has(item.name.toLowerCase())) checkPackaged(path.join(dir, item.name), depth + 1);
          } else if (item.isFile()) {
            const low = item.name.toLowerCase();
            if (low.endsWith(".assets") || low.endsWith(".bundle") || low === "resources.assets" || low.startsWith("sharedassets")) {
              if (!low.endsWith(".ress") && !low.endsWith(".resource")) {
                hasPackagedAssets = true;
                return;
              }
            }
          }
        }
      } catch (e) {}
    };
    checkPackaged(gameDir);

    const pyConfig = this.getPythonExecutionConfig();

    if (hasPackagedAssets && !pyConfig) {
      const errorMsg = "UnityPy não está disponível neste ambiente. O suporte a recursos Unity empacotados não pode ser executado.";
      return {
        ok: false,
        count: 0,
        error: errorMsg,
        engine: "unity",
        found: totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: ignoredCount,
        errors: 1,
        errorList: [errorMsg],
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    // 3. Extract packaged assets via extract_unity_helper.py
    const helperPath = path.join(__dirname, "extract_unity_helper.py");
    if (hasPackagedAssets && pyConfig && fs.existsSync(helperPath)) {
      try {
        const res = spawnSync(pyConfig.pythonExe, [
          helperPath,
          "--game", gameDir,
          "--dest", destDir,
          "--type", type
        ], {
          cwd: gameDir,
          env: pyConfig.env,
          encoding: "utf-8",
          maxBuffer: 50 * 1024 * 1024,
          timeout: 180000
        });

        if (res.status === 0 && res.stdout) {
          try {
            const data = JSON.parse(res.stdout.trim());
            if (data.needExtractor) {
              const errorMsg = "UnityPy não está disponível neste ambiente. O suporte a recursos Unity empacotados não pode ser executado.";
              return {
                ok: false,
                count: 0,
                error: errorMsg,
                engine: "unity",
                found: totalFound + (data.found || 0),
                extracted: 0,
                duplicates: 0,
                collisions: 0,
                physicalWritten: 0,
                ignored: ignoredCount,
                errors: 1,
                errorList: [errorMsg],
                originDir: gameDir,
                destDir: destDir,
                sources: sources
              };
            } else {
              totalFound += (data.found || 0);
              extractedCount += (data.extracted || 0);
              duplicatesCount += (data.duplicates || 0);
              collisionsCount += (data.collisions || 0);
              if (data.sources && data.sources.length > 0) {
                sources.push(...data.sources);
              }
              if (data.errorList && data.errorList.length > 0) {
                allErrors.push(...data.errorList);
              }
            }
          } catch (pe) {
            allErrors.push("Erro ao interpretar saída do extrator Unity: " + pe.message);
          }
        } else if (res.stderr) {
          allErrors.push("Erro no helper Unity: " + res.stderr.slice(0, 300));
        }
      } catch (ex) {
        allErrors.push("Exceção ao disparar extrator Unity: " + ex.message);
      }
    }

    if (extractedCount === 0 && duplicatesCount === 0) {
      return {
        ok: false,
        count: 0,
        error: "Nenhum recurso suportado encontrado para Unity.",
        engine: "unity",
        found: totalFound,
        extracted: 0,
        duplicates: 0,
        collisions: 0,
        physicalWritten: 0,
        ignored: ignoredCount,
        errors: allErrors.length,
        errorList: allErrors,
        originDir: gameDir,
        destDir: destDir,
        sources: sources
      };
    }

    return this.formatResult({
      ok: true,
      engine: "unity",
      found: totalFound,
      extracted: extractedCount,
      duplicates: duplicatesCount,
      collisions: collisionsCount,
      physicalWritten: extractedCount,
      ignored: ignoredCount,
      errors: allErrors.length,
      errorList: allErrors,
      originDir: gameDir,
      destDir: destDir,
      sources: sources
    });
  }
}

module.exports = UnityMediaExtractor;
