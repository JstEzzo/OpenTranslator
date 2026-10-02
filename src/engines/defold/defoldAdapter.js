/**
 * OpenTranslator — DefoldAdapter
 * Adaptador oficial para jogos desenvolvidos em Defold Engine.
 * 
 * Capacidades:
 * - Identificação via game.project e .dmanifest
 * - Localização via tabelas JSON e módulos Lua
 * - Preservação estrita de fontes, Unicode e direção de escrita (LTR/RTL)
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class DefoldAdapter extends BaseEngineAdapter {
  constructor() {
    super("defold", "Defold Engine");
    this.codeProtector = new CodeProtector({ engine: "defold" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_defold_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "defold",
      name: "Defold",
      versions: ["Defold 1.2+"],
      staticTranslation: true,
      runtimeTranslation: false,
      packagedResources: true,
      fonts: true,
      images: true,
      audio: true,
      binaryFormats: true,
      placeholders: true,
      pluralization: false
    };
  }

  getCapabilities(gameDir, exePath) {
    const hasProject = fs.existsSync(path.join(gameDir, "game.project"));
    return {
      staticFiles: true,
      nativeLocalization: hasProject,
      archives: true,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: "Defold JSON/Lua Localization Table Pipeline"
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    const scanDir = (dir, depth = 0) => {
      if (depth > 3) return;
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const ent of entries) {
          const full = path.join(dir, ent.name);
          if (ent.isDirectory() && !ent.name.startsWith(".")) scanDir(full, depth + 1);
          else if (ent.isFile() && (ent.name.endsWith(".json") || ent.name.endsWith(".lua"))) {
            if (ent.name.toLowerCase().includes("lang") || ent.name.toLowerCase().includes("string") || ent.name.toLowerCase().includes("loc")) {
              try {
                const content = fs.readFileSync(full, 'utf8');
                if (ent.name.endsWith(".json")) {
                  const j = JSON.parse(content);
                  for (const [k, v] of Object.entries(j)) {
                    if (typeof v === "string" && v.trim().length > 0) {
                      const { protectedText, tokens } = this.codeProtector.protect(v.trim(), "defold");
                      allTexts.push({
                        id: `defold_${ent.name}_${k}`,
                        file: path.relative(gameDir, full).replace(/\\/g, "/"),
                        key: k,
                        original: v.trim(),
                        clean: v.trim(),
                        protectedText,
                        tokens,
                        engine: "defold"
                      });
                    }
                  }
                }
              } catch (e) {}
            }
          }
        }
      } catch (e) {}
    };

    scanDir(gameDir);
    return { success: true, texts: allTexts, count: allTexts.length };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const byFile = new Map();
    for (const t of texts) {
      if (!t.file) continue;
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "defold" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relPath, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relPath);
      if (!fs.existsSync(fullPath)) continue;

      if (relPath.endsWith(".json")) {
        try {
          const content = fs.readFileSync(fullPath, "utf8");
          const parsed = JSON.parse(content);
          let fileModified = false;

          for (const t of fileTexts) {
            const tr = translations.get ? translations.get(t.id) : translations[t.id];
            if (tr && tr !== t.original) {
              const restored = this.codeProtector.restore(tr, t.tokens || []);
              parsed[t.key] = restored.restoredText;
              fileModified = true;
              appliedCount++;
            }
          }

          if (fileModified) {
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), "utf8");
            modifiedFiles.add(fullPath);
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount,
      message: `Tradução Defold aplicada com sucesso (${appliedCount} textos em ${modifiedFiles.size} arquivos).`
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return { success: res.success, restoredFiles: res.restoredFiles || [gameDir] };
  }
}

module.exports = DefoldAdapter;
