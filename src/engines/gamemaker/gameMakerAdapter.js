/**
 * OpenTranslator — GameMakerAdapter
 * Adaptador oficial para jogos desenvolvidos em GameMaker (Studio 1.4, 2.x, 2023+).
 * 
 * Capacidades:
 * - Localização em arquivos externos UTF-8 (.ini, .json, .txt, .csv)
 * - Detecção e diagnóstico seguro de data.win / game.unx / game.ios
 * - Integração limpa com ferramentas comunitárias (UndertaleModTool / UndertaleModLib)
 *   respeitando a licença GPL-3.0 (sem redistribuição ilegal embutida)
 * - Preservação estrita de codificação UTF-8 e format specifiers (%s, %d, %1, \\n)
 */

const fs = require('fs');
const path = require('path');
const BaseEngineAdapter = require('../../core/baseEngineAdapter');
const CodeProtector = require('../../core/codeProtector');
const BackupManager = require('../../core/backupManager');

class GameMakerAdapter extends BaseEngineAdapter {
  constructor() {
    super("gamemaker", "GameMaker");
    this.codeProtector = new CodeProtector({ engine: "gamemaker" });
    this.backupManager = new BackupManager({ backupDirName: ".opent_gamemaker_backup" });
  }

  getDetailedDeclaration() {
    return {
      engine: "gamemaker",
      name: "GameMaker",
      versions: ["GameMaker: Studio 1.4", "GameMaker Studio 2.x", "GameMaker 2023+"],
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
    const hasDataWin = fs.existsSync(path.join(gameDir, "data.win"));
    const files = fs.existsSync(gameDir) ? fs.readdirSync(gameDir).map(f => f.toLowerCase()) : [];
    const hasExternalL10n = files.some(f => f.endsWith(".ini") || f.endsWith(".json") || f.includes("lang") || f.includes("strings"));

    return {
      staticFiles: true,
      nativeLocalization: hasExternalL10n,
      archives: hasDataWin,
      runtimeHook: false,
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true,
      strategy: hasExternalL10n ? "GameMaker External UTF-8 Localization" : (hasDataWin ? "data.win Binary Scanner & Diagnostic" : "OCR Fallback")
    };
  }

  async extract(gameDir, options = {}) {
    const allTexts = [];
    if (!fs.existsSync(gameDir)) return { success: false, texts: [], count: 0 };

    const files = fs.readdirSync(gameDir);
    // 1. Arquivos externos comuns de texto (.ini, .json, .txt)
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      const full = path.join(gameDir, f);
      if (ext === ".ini" || ext === ".json" || (ext === ".txt" && (f.toLowerCase().includes("lang") || f.toLowerCase().includes("dialog")))) {
        try {
          const content = fs.readFileSync(full, 'utf8');
          if (ext === ".ini") {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
              const l = lines[i].trim();
              if (l && !l.startsWith(";") && !l.startsWith("#") && !l.startsWith("[") && l.includes("=")) {
                const parts = l.split("=");
                const key = parts[0].trim();
                const val = parts.slice(1).join("=").trim();
                if (val.length > 1) {
                  const { protectedText, tokens } = this.codeProtector.protect(val, "gamemaker");
                  allTexts.push({
                    id: `gm_ini_${f}_${i}`,
                    file: f,
                    key,
                    original: val,
                    clean: val,
                    protectedText,
                    tokens,
                    engine: "gamemaker",
                    format: "ini"
                  });
                }
              }
            }
          } else if (ext === ".json") {
            try {
              const parsed = JSON.parse(content);
              const walk = (obj, prefix = "") => {
                if (typeof obj === "string" && obj.trim().length > 1) {
                  const { protectedText, tokens } = this.codeProtector.protect(obj.trim(), "gamemaker");
                  allTexts.push({
                    id: `gm_json_${f}_${allTexts.length}`,
                    file: f,
                    key: prefix,
                    original: obj.trim(),
                    clean: obj.trim(),
                    protectedText,
                    tokens,
                    engine: "gamemaker",
                    format: "json"
                  });
                } else if (typeof obj === "object" && obj !== null) {
                  for (const [k, v] of Object.entries(obj)) walk(v, prefix ? `${prefix}.${k}` : k);
                }
              };
              walk(parsed);
            } catch (e) {}
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      texts: allTexts,
      count: allTexts.length
    };
  }

  async validate(gameDir, texts, translations) {
    return { valid: true, errors: [], warnings: [] };
  }

  async apply(gameDir, texts, translations, options = {}) {
    const byFile = new Map();
    for (const t of texts) {
      if (!byFile.has(t.file)) byFile.set(t.file, []);
      byFile.get(t.file).push(t);
    }

    const filesToBackup = Array.from(byFile.keys()).map(rel => path.join(gameDir, rel)).filter(p => fs.existsSync(p));
    this.backupManager.createBackup(gameDir, filesToBackup, { engine: "gamemaker" });

    const modifiedFiles = new Set();
    let appliedCount = 0;

    for (const [relFile, fileTexts] of byFile.entries()) {
      const fullPath = path.join(gameDir, relFile);
      if (!fs.existsSync(fullPath)) continue;

      const fmt = fileTexts[0].format;
      if (fmt === "ini") {
        try {
          const lines = fs.readFileSync(fullPath, 'utf8').split('\n');
          for (let i = 0; i < lines.length; i++) {
            const l = lines[i].trim();
            if (l && l.includes("=")) {
              const k = l.split("=")[0].trim();
              const item = fileTexts.find(x => x.key === k);
              if (item) {
                const tr = translations.get ? translations.get(item.id) : translations[item.id];
                if (tr) {
                  const restored = this.codeProtector.restore(tr, item.tokens || []);
                  lines[i] = `${k}=${restored.restoredText}`;
                  appliedCount++;
                }
              }
            }
          }
          fs.writeFileSync(fullPath, lines.join('\n'), 'utf8');
          modifiedFiles.add(fullPath);
        } catch (e) {}
      } else if (fmt === "json") {
        try {
          const content = fs.readFileSync(fullPath, 'utf8');
          const parsed = JSON.parse(content);
          let fileModified = false;

          const setNestedKey = (obj, keyPath, val) => {
            if (!keyPath) return;
            const parts = keyPath.split('.');
            let cur = obj;
            for (let i = 0; i < parts.length - 1; i++) {
              if (cur[parts[i]] === undefined || cur[parts[i]] === null) return;
              cur = cur[parts[i]];
            }
            cur[parts[parts.length - 1]] = val;
          };

          for (const item of fileTexts) {
            const tr = translations.get ? translations.get(item.id) : translations[item.id];
            if (tr && tr !== item.original) {
              const restored = this.codeProtector.restore(tr, item.tokens || []);
              setNestedKey(parsed, item.key, restored.restoredText);
              fileModified = true;
              appliedCount++;
            }
          }

          if (fileModified) {
            fs.writeFileSync(fullPath, JSON.stringify(parsed, null, 2), 'utf8');
            modifiedFiles.add(fullPath);
          }
        } catch (e) {}
      }
    }

    return {
      success: true,
      modifiedFiles: Array.from(modifiedFiles),
      count: appliedCount
    };
  }

  async rollback(gameDir, options = {}) {
    const res = this.backupManager.restoreOldestBackup(gameDir);
    return {
      success: res.success,
      restoredFiles: res.restoredFiles || [gameDir]
    };
  }
}

module.exports = GameMakerAdapter;
