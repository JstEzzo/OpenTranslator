const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn, execSync } = require("child_process");

const {
  isJsCode,
  extractEscapeCodes,
  restoreEscapeCodes,
  extractGameTexts,
  getLastRealKey
} = require("./extractor");

const {
  loadGlobalCacheForLang,
  saveNewGlobalTranslations,
  loadCommonTranslations,
  getCommonTranslation,
  loadGlossary,
  loadCfg
} = require("./cache");

const { translateBatch } = require("./translator");

const ENGINES_DEF = {
  mv: { label: "RPG Maker MV", js: true, icon: "\ud83c\udfae" },
  mz: { label: "RPG Maker MZ", js: true, icon: "\ud83c\udfae" },
  krkr: { label: "Kirikiri 2", js: false, icon: "\u2728" },
  krkrz: { label: "Kirikiri Z", js: false, icon: "\u2728" },
  wolf: { label: "Wolf RPG", js: false, icon: "\ud83d\udc3a" },
  rgss: { label: "RGSS (XP/VX/Ace)", js: false, icon: "\u2699" },
  unity: { label: "Unity", js: false, icon: "\ud83c\udf10" },
  python: { label: "Ren'Py", js: false, icon: "\ud83d\udc0d" },
  srpg: { label: "SRPG Studio", js: false, icon: "\u2694" },
  agtk: { label: "Action Game Toolkit", js: false, icon: "\ud83c\udff0" },
  kmy: { label: "KMY", js: false, icon: "\ud83d\udd2e" },
  bakin: { label: "Bakin", js: false, icon: "\ud83c\udfad" },
  tyrano: { label: "TyranoScript", js: true, icon: "\ud83d\udcdd" },
  renpy: { label: "Ren'Py (JS)", js: true, icon: "\ud83d\udc0d" },
};

function findDataDir(gameDir) {
  if (fs.existsSync(path.join(gameDir, "www", "data")))
    return path.join(gameDir, "www", "data");
  if (fs.existsSync(path.join(gameDir, "data")))
    return path.join(gameDir, "data");
  return "";
}

function detectEngine(exePath, exeDir) {
  if (!exePath || typeof exePath !== "string") return "mz";
  
  let targetFile = exePath;
  let dir = exeDir;

  // Se o caminho passado for um diretório (ex: a pasta do jogo)
  if (fs.existsSync(targetFile)) {
    try {
      const st = fs.statSync(targetFile);
      if (st.isDirectory()) {
        dir = targetFile;
        const subFiles = fs.readdirSync(dir);
        const exeMatch = subFiles.find((f) => f.toLowerCase().endsWith(".exe"));
        if (exeMatch) {
          targetFile = path.join(dir, exeMatch);
        }
      } else {
        dir = exeDir || path.dirname(targetFile);
      }
    } catch (e) {}
  } else if (dir && fs.existsSync(dir)) {
    const candidate = path.join(dir, path.basename(targetFile));
    if (fs.existsSync(candidate)) {
      targetFile = candidate;
    }
  }

  const baseName = path.basename(targetFile, path.extname(targetFile)).toLowerCase();
  const fullExeName = path.basename(targetFile).toLowerCase();

  // 1. CHECAGEM POR ESTRUTURA DE DIRETÓRIOS E ARQUIVOS CARACTERÍSTICOS
  if (dir && fs.existsSync(dir)) {
    try {
      const files = fs.readdirSync(dir);
      const fl = files.map((f) => f.toLowerCase());

      // CHECAGEM DEFINITIVA DE REN'PY
      // Ren'Py possui inconfundivelmente: pasta 'renpy', pasta 'game', arquivo .py com nome do exe, ou scripts .rpy/.rpyc/.rpa
      const hasRenpyFolder = fl.includes("renpy");
      const hasGameFolder = fl.includes("game");
      const hasLibFolder = fl.includes("lib");
      const hasPyScript = fl.includes(baseName + ".py") || fl.some((f) => f.endsWith(".py") && f !== "setup.py");
      const hasRpyFile = fl.some((f) => f.endsWith(".rpy") || f.endsWith(".rpyc") || f.endsWith(".rpa"));

      if (hasRenpyFolder || (hasGameFolder && (hasLibFolder || hasPyScript || hasRpyFile))) {
        return "python";
      }

      // Verificação profunda dentro da pasta game/ para Ren'Py
      if (hasGameFolder) {
        try {
          const gameSubFiles = fs.readdirSync(path.join(dir, "game")).map((f) => f.toLowerCase());
          if (gameSubFiles.some((f) => f.endsWith(".rpy") || f.endsWith(".rpyc") || f.endsWith(".rpa") || f === "script.rpy")) {
            return "python";
          }
        } catch (e) {}
      }

      // RPG Maker MZ / MV
      if (fl.some((f) => f === "www" && fs.statSync(path.join(dir, "www")).isDirectory())) return "mz";
      if (fl.some((f) => f === "index.html") && fl.some((f) => f === "package.json") && fl.some((f) => f.startsWith("nw."))) return "mz";
      if (fl.some((f) => f === "rmmz_core.js" || f === "rpg_core.js")) return "mz";
      if (fl.includes("js")) {
        try {
          const jsFiles = fs.readdirSync(path.join(dir, "js")).map((f) => f.toLowerCase());
          if (jsFiles.some((f) => f === "rmmz_core.js" || f === "rpg_core.js")) return "mz";
        } catch (e) {}
      }

      // Kirikiri
      if (fl.some((f) => f.endsWith(".xp3"))) return "krkr";

      // RGSS (XP / VX / VXAce)
      if (fl.some((f) => f === "game.rvproj2" || f === "game.rxproj" || f === "game.rvproj" || f.endsWith(".rvdata2") || f.endsWith(".rvdata") || f.endsWith(".rxdata"))) {
        return "rgss";
      }

      // Wolf RPG
      if (fl.some((f) => f === "data.wolf" || f === "game.ini" || f === "editor.ini")) return "wolf";
      if (fl.includes("data")) {
        try {
          const sub = fs.readdirSync(path.join(dir, "Data")).map((f) => f.toLowerCase());
          if (sub.includes("basicdata") || sub.includes("mapdata") || sub.some((f) => f.endsWith(".wolf") || f === "basicdata.zip")) {
            return "wolf";
          }
        } catch (e) {}
      }

      // TyranoScript
      if (fl.some((f) => f === "tyranoscript" || f === "tyranobuilder.html")) return "tyrano";

      // Unity (Presença de pasta <GameName>_Data)
      if (fl.some((f) => f === baseName + "_data" || (f.endsWith("_data") && fs.statSync(path.join(dir, f)).isDirectory()))) {
        return "unity";
      }
    } catch (e) {}
  }

  // 2. CHECAGEM VIA CONTEÚDO BINÁRIO DO EXECUTÁVEL (.EXE)
  if (fs.existsSync(targetFile)) {
    try {
      const buf = fs.readFileSync(targetFile, { encoding: "utf8", flag: "r" }).substring(0, 200000);
      if (buf.includes("renpy") || buf.includes("Ren'Py") || buf.includes("renpython") || buf.includes("renpy.bootstrap")) return "python";
      if (buf.includes("RPGVXAce") || buf.includes("RGSS3") || buf.includes("RGSS2")) return "rgss";
      if (buf.includes("WolfRPG") || buf.includes("Wolf RPG Editor")) return "wolf";
      if (buf.includes("TyranoBuilder") || buf.includes("tyranoscript")) return "tyrano";
      if (buf.includes("UnityPlayer") || buf.includes("UnityEngine")) return "unity";
      if (buf.includes("BootKirikiriZ")) return "krkrz";
      if (buf.includes("Kirikiri") || buf.includes("TVP")) return "krkr";
      if (buf.includes("SRPG Studio") || buf.includes("SRPG")) return "srpg";
      if (buf.includes("SmileBoom") || buf.includes("ActionGameToolkit")) return "agtk";
      if (buf.includes("Bakin")) return "bakin";
      if (buf.includes("kmy")) return "kmy";
      if (buf.includes("www/") || buf.includes("System.png") || buf.includes("rpg_core")) return "mz";
    } catch (e) {}
  }

  // 3. FALLBACKS POR NOME
  if (baseName.includes("renpy") || baseName.includes("ren_py")) return "python";
  if (baseName.includes("rpg") || baseName.includes("game")) return "mz";
  if (baseName.includes("unity") || baseName.includes("win")) return "unity";

  return "mz";
}

function getExeArch(exePath) {
  try {
    const fd = fs.openSync(exePath, "r");
    const buf = Buffer.alloc(4);
    fs.readSync(fd, buf, 0, 4, 0x3c);
    const peOffset = buf.readUInt32LE(0);
    const machineBuf = Buffer.alloc(2);
    fs.readSync(fd, machineBuf, 0, 2, peOffset + 4);
    fs.closeSync(fd);
    const machine = machineBuf.readUInt16LE(0);
    if (machine === 0x8664) return 64;
    if (machine === 0x014c) return 32;
  } catch (e) {}
  return 32;
}

function getHookDll(eng, exePath) {
  const arch = getExeArch(exePath);
  // RPG Maker MV e MZ utilizam patch estático nativo de JSON/plugins.js + CheatOverlay.js.
  // Injeção de DLL em executáveis NW.js (Chromium) causa crash imediato no motor.
  if (eng === "mz" || eng === "mv") {
    return null;
  }
  if (eng === "wolf") {
    try {
      const stats = fs.statSync(exePath);
      if (stats.size > 4000000) {
        return "wolfHook.dll";
      }
    } catch (e) {}
    return "wolfHook3.dll";
  }
  if (eng === "krkrz") {
    return arch === 64 ? "krkrzHook64.dll" : "krkrzHook32.dll";
  }
  if (eng === "krkr") {
    return "krkr2Hook.dll";
  }
  if (eng === "rgss") {
    return arch === 64 ? "RGSSHook64.dll" : "RGSSHook.dll";
  }
  if (eng === "python") {
    return arch === 64 ? "PythonHook64.dll" : "PythonHook.dll";
  }
  if (eng === "srpg") {
    return "SRPGHook.dll";
  }
  if (eng === "agtk") {
    return "AgtkHook.dll";
  }
  return null;
}

function autoWrapText(text, maxChars) {
  if (!text || typeof text !== "string" || maxChars <= 0) return text;
  if (text.includes("\n")) {
    return text
      .split("\n")
      .map((line) => autoWrapText(line, maxChars))
      .join("\n");
  }
  if (text.length <= maxChars) return text;

  const tokenRegex = /(\\[A-Za-z]+\[\d+\]|\\[A-Za-z]+|[^\s\\]+|\\)/g;
  const tokens = text.match(tokenRegex) || [];

  let lines = [];
  let currentLine = "";
  let currentLength = 0;

  for (const token of tokens) {
    const tokenLen = token.length;

    if (currentLength + tokenLen + (currentLength > 0 ? 1 : 0) > maxChars) {
      if (currentLine) {
        lines.push(currentLine);
        currentLine = token;
        currentLength = tokenLen;
      } else {
        lines.push(token);
        currentLine = "";
        currentLength = 0;
      }
    } else {
      if (currentLine) {
        currentLine += " " + token;
        currentLength += 1 + tokenLen;
      } else {
        currentLine = token;
        currentLength = tokenLen;
      }
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }
  return lines.join("\n");
}

function patchGameData(gameDir, texts, translations) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return 0;

  const transByFile = new Map();
  for (const t of texts) {
    const tr = translations.get(t.id);
    if (!tr || tr === t.clean || tr.trim().length === 0) continue;
    if (!transByFile.has(t.file)) transByFile.set(t.file, new Map());
    transByFile.get(t.file).set(JSON.stringify(t.keys), {
      tr,
      escapeParts: t.escapeParts,
      isJsString: t.isJsString,
      jsLiteral: t.jsLiteral,
      jsIndex: t.jsIndex,
    });
  }

  let count = 0;
  for (const [file, fileTrans] of transByFile) {
    if (file === "../js/plugins.js") {
      const wwwDir = path.dirname(dataDir);
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(pluginsJsPath)) {
        try {
          const content = fs.readFileSync(pluginsJsPath, "utf8");
          const startIdx = content.indexOf("[");
          const endIdx = content.lastIndexOf("]");
          if (startIdx >= 0 && endIdx >= 0) {
            const jsonStr = content.slice(startIdx, endIdx + 1);
            const plugins = JSON.parse(jsonStr);

            function patchParam(val, keys) {
              if (typeof val === "string" && val.length > 0) {
                if (
                  (val.startsWith("[") && val.endsWith("]")) ||
                  (val.startsWith("{") && val.endsWith("}"))
                ) {
                  try {
                    const parsed = JSON.parse(val);
                    if (parsed && typeof parsed === "object") {
                      patchParamObject(parsed, [...keys, "__json__"]);
                      return JSON.stringify(parsed);
                    }
                  } catch (e) {}
                }

                if (isJsCode(val)) {
                  const prefixStr = JSON.stringify(keys);
                  const prefix = prefixStr.slice(0, -1) + ",";
                  for (const [keyStr, entry] of fileTrans) {
                    if (
                      keyStr.startsWith(prefix) &&
                      keyStr.includes("__js__")
                    ) {
                      if (entry.isJsString) {
                        const quote = entry.jsLiteral[0];
                        let restored = restoreEscapeCodes(
                          entry.tr,
                          entry.escapeParts
                        );
                        const newLiteral =
                          quote +
                          restored.replace(
                            new RegExp("\\" + quote, "g"),
                            "\\" + quote
                          ) +
                          quote;
                        if (val.includes(entry.jsLiteral)) {
                          val = val.replace(entry.jsLiteral, newLiteral);
                          count++;
                        }
                      }
                    }
                  }
                  return val;
                }

                const lastRealKey = getLastRealKey(keys);
                const isUnsafe = [
                  "dateselect",
                  "dataselect",
                  "selectid",
                  "select_id",
                ].includes(lastRealKey.toLowerCase());
                if (!isUnsafe) {
                  const lookupKey = JSON.stringify(keys);
                  if (fileTrans.has(lookupKey)) {
                    const entry = fileTrans.get(lookupKey);
                    const restored = restoreEscapeCodes(
                      entry.tr,
                      entry.escapeParts
                    );
                    if (restored !== val) {
                      val = restored;
                      count++;
                    }
                  }
                }
              }
              return val;
            }

            function patchParamObject(obj, keys) {
              if (Array.isArray(obj)) {
                obj.forEach((v, i) => {
                  obj[i] = patchParam(v, [...keys, i]);
                });
              } else if (obj && typeof obj === "object") {
                for (const k in obj) {
                  obj[k] = patchParam(obj[k], [...keys, k]);
                }
              }
            }

            plugins.forEach((p, pIdx) => {
              if (p.parameters) {
                for (const k in p.parameters) {
                  p.parameters[k] = patchParam(p.parameters[k], [
                    pIdx,
                    "parameters",
                    k,
                  ]);
                }
              }
            });

            const prefix = content.slice(0, startIdx);
            const suffix = content.slice(endIdx + 1);
            fs.writeFileSync(
              pluginsJsPath,
              prefix + JSON.stringify(plugins, null, 2) + suffix,
              "utf8"
            );
            global.log("info", "Arquivo de plugins patcheado: js/plugins.js");
          }
        } catch (e) {
          global.log("error", "Falha ao patchear js/plugins.js: " + e.message);
        }
      }
      continue;
    }

    try {
      const raw = fs.readFileSync(path.join(dataDir, file), "utf8");
      const data = JSON.parse(raw);
      let fileModified = false;
      for (const [keyStr, entry] of fileTrans) {
        const keys = JSON.parse(keyStr);
        let isJs = false;
        let realKeys = keys;
        if (
          keys.length > 0 &&
          typeof keys[keys.length - 1] === "string" &&
          keys[keys.length - 1].startsWith("__js__")
        ) {
          isJs = true;
          realKeys = keys.slice(0, -1);
        }

        let obj = data,
          success = true;
        for (let i = 0; i < realKeys.length - 1; i++) {
          const k = realKeys[i];
          if (obj && typeof obj === "object" && k in obj) obj = obj[k];
          else {
            success = false;
            break;
          }
        }
        if (!success) continue;
        const lastKey = realKeys[realKeys.length - 1];
        if (obj && typeof obj === "object" && lastKey in obj) {
          const origVal = String(obj[lastKey]).trim();
          if (
            /\.(png|jpg|jpeg|gif|bmp|webp|ogg|wav|mp3|m4a|json|efkefc|atlas|skel)$/i.test(origVal) ||
            /^(img|audio|fonts|js|data|icon|css|locales|movies)[\/\\]/i.test(origVal)
          ) {
            continue;
          }

          const parentCmd = getValueAtPath(data, realKeys.slice(0, -2));
          if (parentCmd && typeof parentCmd.code === "number") {
            const nonDialogueCodes = new Set([231, 232, 281, 241, 245, 249, 250, 132, 133, 139, 322, 323]);
            if (nonDialogueCodes.has(parentCmd.code)) {
              continue;
            }
          }

          let restored = restoreEscapeCodes(entry.tr, entry.escapeParts);

          if (isJs && entry.isJsString) {
            const originalScript = obj[lastKey];
            const quote = entry.jsLiteral[0];
            const newLiteral =
              quote +
              restored.replace(new RegExp("\\" + quote, "g"), "\\" + quote) +
              quote;
            if (originalScript.includes(entry.jsLiteral)) {
              obj[lastKey] = originalScript.replace(
                entry.jsLiteral,
                newLiteral
              );
              fileModified = true;
              count++;
            }
          } else {
            const parentCmd = getValueAtPath(data, realKeys.slice(0, -2));
            if (
              parentCmd &&
              (parentCmd.code === 355 || parentCmd.code === 655)
            ) {
              restored = "テキスト-" + restored;
            }
            if (parentCmd && parentCmd.code === 401) {
              const cfg = loadCfg();
              const wrapLimit = parseInt(cfg.wordWrapLimit, 10) || 0;
              if (wrapLimit > 0) {
                restored = autoWrapText(restored, wrapLimit);
              }
            }
            if (restored !== obj[lastKey]) {
              obj[lastKey] = restored;
              fileModified = true;
              count++;
            }
          }
        }
      }
      if (fileModified) {
        fs.writeFileSync(
          path.join(dataDir, file),
          JSON.stringify(data, null, 4),
          "utf8"
        );
        global.log("info", `Arquivo patcheado: ${file}`);
      }
    } catch (e) {
      global.log("error", `Falha ao patchear arquivo ${file}: ${e.message}`);
    }
  }
  global.log("success", "Patched " + count + " texts");
  return count;
}

function backupGameData(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return "";
  const bakDir = dataDir + "_bak_" + Date.now();
  try {
    fs.cpSync(dataDir, bakDir, { recursive: true, force: true });
    const wwwDir = path.dirname(dataDir);
    const htmlPath = path.join(wwwDir, "index.html");
    if (fs.existsSync(htmlPath)) {
      try {
        fs.copyFileSync(htmlPath, path.join(bakDir, "index.html"));
      } catch (e) {}
    }
    const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
    if (fs.existsSync(pluginsJsPath)) {
      try {
        fs.copyFileSync(pluginsJsPath, path.join(bakDir, "plugins.js_bak"));
      } catch (e) {}
    }
    global.log("info", "Backup: " + path.basename(bakDir));
    return bakDir;
  } catch (e) {
    global.log("error", "Backup failed: " + e.message);
    return "";
  }
}

function restoreGameData(bakDir) {
  if (!bakDir || !fs.existsSync(bakDir)) return false;
  const parentDir = path.dirname(bakDir);
  const baseName = path.basename(bakDir).replace(/_bak_\d+$/, "");
  const origDir = path.join(parentDir, baseName);
  try {
    if (fs.existsSync(origDir))
      fs.rmSync(origDir, { recursive: true, force: true });
    fs.cpSync(bakDir, origDir, { recursive: true, force: true });
    const bakHtml = path.join(bakDir, "index.html");
    const wwwDir = path.dirname(origDir);
    if (fs.existsSync(bakHtml)) {
      try {
        const htmlPath = path.join(wwwDir, "index.html");
        if (fs.existsSync(htmlPath)) fs.unlinkSync(htmlPath);
        fs.copyFileSync(bakHtml, htmlPath);
      } catch (e) {}
    }
    const bakPlugins = path.join(bakDir, "plugins.js_bak");
    const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
    if (fs.existsSync(bakPlugins)) {
      try {
        if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
        fs.copyFileSync(bakPlugins, pluginsJsPath);
      } catch (e) {}
    }
    const cheatScript = path.join(wwwDir, "CheatOverlay.js");
    if (fs.existsSync(cheatScript)) {
      try {
        fs.unlinkSync(cheatScript);
      } catch (e) {}
    }
    fs.rmSync(bakDir, { recursive: true, force: true });
    global.log("info", "Restored original data from backup");
    return true;
  } catch (e) {
    global.log("error", "Restore failed: " + e.message);
    return false;
  }
}

function restoreOldestBackup(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return;
  const parentDir = path.dirname(dataDir);
  const baseName = path.basename(dataDir);

  try {
    const items = fs.readdirSync(parentDir);
    const backups = [];
    for (const item of items) {
      const fullPath = path.join(parentDir, item);
      if (fs.statSync(fullPath).isDirectory()) {
        const match = item.match(new RegExp("^" + baseName + "_bak_(\\d+)$"));
        if (match) {
          backups.push({
            path: fullPath,
            timestamp: parseInt(match[1], 10),
          });
        }
      }
    }

    if (backups.length > 0) {
      backups.sort((a, b) => a.timestamp - b.timestamp);
      const oldestBak = backups[0].path;
      global.log(
        "info",
        "Self-Healing: Restaurando backup anterior não-restaurado: " +
          path.basename(oldestBak)
      );

      if (fs.existsSync(dataDir)) {
        fs.rmSync(dataDir, { recursive: true, force: true });
      }

      fs.cpSync(oldestBak, dataDir, { recursive: true, force: true });

      const wwwDir = path.dirname(dataDir);
      const bakPlugins = path.join(oldestBak, "plugins.js_bak");
      const pluginsJsPath = path.join(wwwDir, "js", "plugins.js");
      if (fs.existsSync(bakPlugins)) {
        try {
          if (fs.existsSync(pluginsJsPath)) fs.unlinkSync(pluginsJsPath);
          fs.copyFileSync(bakPlugins, pluginsJsPath);
        } catch (e) {}
      }

      for (const bak of backups) {
        if (fs.existsSync(bak.path)) {
          fs.rmSync(bak.path, { recursive: true, force: true });
        }
      }
      global.log(
        "info",
        "Self-Healing: Backup restaurado e arquivos temporários limpos com sucesso."
      );
    }
  } catch (e) {
    global.log("warn", "Falha ao processar auto-restauração de backup: " + e.message);
  }
}

function checkProcessRunning() {
  if (!global.launchedProc) return { key: null, running: false, exitCode: null };
  try {
    const ec = global.launchedProc.exitCode;
    return ec === null
      ? { key: global.launchedKey, running: true, exitCode: null }
      : { key: null, running: false, exitCode: ec };
  } catch (e) {
    return { key: null, running: false, exitCode: null };
  }
}

async function findGameOnDisk(fileName) {
  const fsp = fs.promises;
  const desktopPath = path.join(os.homedir(), "Desktop");
  const roots = [
    desktopPath,
    path.join(desktopPath, "Nova pasta"),
    path.join(os.homedir(), "Downloads"),
    path.join(os.homedir(), "Documents"),
    path.resolve(global.ROOT, ".."),
    path.resolve(global.ROOT, "..", ".."),
  ];
  const results = [];

  for (const root of roots) {
    try {
      if (!(await fsp.stat(root).catch(() => null))) continue;

      async function scan(dir, depth) {
        if (depth > 4) return;
        try {
          const entries = await fsp.readdir(dir, { withFileTypes: true });
          for (const e of entries) {
            if (!e.isDirectory() || e.name.startsWith(".")) continue;
            const sub = path.join(dir, e.name);
            try {
              const target = path.join(sub, fileName);
              const st = await fsp.stat(target).catch(() => null);
              if (st && st.isFile()) {
                const detectedEng = detectEngine(target, sub);
                results.push({
                  name: e.name,
                  exePath: target,
                  engine: detectedEng,
                  size: st.size,
                  mtime: st.mtimeMs,
                });
                continue;
              }
            } catch (er) {
              logWarn(`[findGameOnDisk] Falha ao verificar ${sub}: ${er.message}`);
            }
            await scan(sub, depth + 1);
          }
        } catch (e) {
          logWarn(`[findGameOnDisk] Falha ao ler diretório ${dir}: ${e.message}`);
        }
      }
      await scan(root, 0);
    } catch (e) {
      logWarn(`[findGameOnDisk] Falha na varredura da raiz ${root}: ${e.message}`);
    }
  }
  const seen = new Set();
  return results.filter((r) => {
    if (seen.has(r.exePath)) return false;
    seen.add(r.exePath);
    return true;
  });
}

async function runPythonScript(scriptPath, args) {
  const localPython = path.join(
    global.ROOT,
    "resources",
    "renpy",
    "python",
    "python.exe"
  );
  const pythonCmds = [];
  if (fs.existsSync(localPython)) {
    pythonCmds.push(localPython);
  }
  pythonCmds.push("python", "python3", "py");

  let lastError = null;
  for (const cmd of pythonCmds) {
    try {
      const output = await new Promise((resolve, reject) => {
        const proc = spawn(cmd, [scriptPath, ...args], { timeout: 60000 });
        let stdout = "";
        let stderr = "";
        proc.stdout.on("data", (d) => (stdout += d));
        proc.stderr.on("data", (d) => (stderr += d));
        proc.on("error", (err) => reject(err));
        proc.on("exit", (code) => {
          if (code === 0) resolve(stdout || "Done");
          else reject(new Error(stderr || `Python exit code ${code}`));
        });
      });
      return output;
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(
    `Python não foi encontrado ou falhou ao executar. Erro: ${
      lastError ? lastError.message : "Desconhecido"
    }`
  );
}

function healGameData(gameDir) {
  const dataDir = findDataDir(gameDir);
  if (!dataDir) return;
  const sysPath = path.join(dataDir, "System.json");
  if (!fs.existsSync(sysPath)) return;

  try {
    let modified = false;
    const sys = JSON.parse(fs.readFileSync(sysPath, "utf8"));

    let seDir = path.join(gameDir, "audio", "se");
    if (!fs.existsSync(seDir)) {
      const wwwDir = path.join(gameDir, "www");
      if (fs.existsSync(path.join(wwwDir, "audio", "se"))) {
        seDir = path.join(wwwDir, "audio", "se");
      }
    }

    if (fs.existsSync(seDir) && sys.sounds && Array.isArray(sys.sounds)) {
      const defaultSounds = [
        "Cursor1",
        "Decision1",
        "Cancel1",
        "Buzzer1",
        "Equip1",
        "Save1",
        "Load1",
        "Battle1",
        "Escape1",
        "Attack1",
        "Damage1",
        "Collapse1",
        "Collapse2",
        "Damage2",
        "Collapse3",
        "Recovery1",
        "Miss1",
        "Evasion1",
        "Shop1",
        "Item1",
        "Skill1",
      ];

      sys.sounds.forEach((s, idx) => {
        if (s && s.name) {
          const fileExists =
            fs.existsSync(path.join(seDir, s.name + ".ogg")) ||
            fs.existsSync(path.join(seDir, s.name + ".ogg_"));
          if (!fileExists) {
            const defName = defaultSounds[idx];
            if (defName) {
              const defExists =
                fs.existsSync(path.join(seDir, defName + ".ogg")) ||
                fs.existsSync(path.join(seDir, defName + ".ogg_"));
              if (defExists) {
                global.log(
                  "info",
                  `Autocorreção de Áudio: Som revertido no índice ${idx} de "${s.name}" para o padrão "${defName}"`
                );
                s.name = defName;
                modified = true;
              }
            }
          }
        }
      });
    }

    if (modified) {
      fs.writeFileSync(sysPath, JSON.stringify(sys, null, 2), "utf8");
      global.log(
        "info",
        "Autocorreção de Áudio: System.json reparado e salvo com sucesso."
      );
    }
  } catch (e) {
    global.log("warn", "Autocorreção de Áudio falhou: " + e.message);
  }

  healFonts(gameDir);
}

function healFonts(gameDir) {
  try {
    const dataDir = findDataDir(gameDir);
    if (!dataDir) return;
    const wwwDir = path.dirname(dataDir);
    const candidateDirs = [
      path.join(wwwDir, "fonts"),
      path.join(gameDir, "fonts"),
      path.join(wwwDir, "font"),
      path.join(gameDir, "font"),
    ];

    let fontsDir = null;
    for (const d of candidateDirs) {
      if (fs.existsSync(d)) {
        fontsDir = d;
        break;
      }
    }
    if (!fontsDir) return;

    const files = fs.readdirSync(fontsDir);
    if (files.length === 0) return;

    for (const f of files) {
      const ext = path.extname(f);
      if (![".woff", ".woff2", ".ttf", ".otf"].includes(ext.toLowerCase())) continue;
      const base = path.basename(f, ext);

      if (/[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]/.test(base)) {
        const aliases = [
          "Mosaico Kiniro" + ext,
          "Mosaico_Kiniro" + ext,
          "GameFont" + ext,
          "main" + ext,
        ];
        for (const alias of aliases) {
          const aliasPath = path.join(fontsDir, alias);
          if (!fs.existsSync(aliasPath)) {
            try {
              fs.copyFileSync(path.join(fontsDir, f), aliasPath);
              global.log(
                "info",
                `Self-Healing Fontes: Criado alias de fonte automático "${alias}" a partir de "${f}".`
              );
            } catch (e) {}
          }
        }
      }
    }
  } catch (e) {
    global.log("warn", "Self-Healing Fontes falhou: " + e.message);
  }
}

async function executeTranslationPipeline(gameDir, cfg, title) {
  global.log("info", "Iniciando pipeline de tradução para: " + (title || gameDir));

  restoreOldestBackup(gameDir);
  healGameData(gameDir);

  global.log("info", "Criando backup dos arquivos de dados...");
  const bakDir = backupGameData(gameDir);
  if (!bakDir) {
    global.log("warn", "Backup não criado ou ignorado.");
  } else {
    global.log("info", "Backup criado com sucesso: " + bakDir);
  }

  global.log("info", "Escaneando arquivos de dados e extraindo textos...");
  const texts = extractGameTexts(gameDir);
  global.log("info", `Total de textos extraídos: ${texts.length}`);

  if (texts.length === 0) {
    global.log("info", "Nenhum texto traduzível encontrado.");
    return bakDir;
  }

  const cacheFile = path.join(gameDir, "trans_cache.json");
  let cacheTranslations = null;
  const sl = cfg.sl || "auto";
  const tl = cfg.tl || "pt";
  const engine = cfg.engine || "google";
  const cfgKey = sl + "|" + tl + "|" + engine;

  if (fs.existsSync(cacheFile)) {
    try {
      const cd = JSON.parse(fs.readFileSync(cacheFile, "utf8"));
      if (cd.cfgKey === cfgKey && cd.translations) {
        cacheTranslations = cd.translations;
      }
    } catch (e) {
      global.log("error", "Falha ao ler cache local do jogo: " + e.message);
    }
  }

  const translations = new Map();
  let localCacheMatches = 0;
  let globalCacheMatches = 0;
  let commonMatches = 0;

  const globalLangCache = loadGlobalCacheForLang(sl, tl);
  const commonTrans = loadCommonTranslations();

  if (cacheTranslations) {
    for (const t of texts) {
      const k = t.file + ":" + t.keys.join(".") + ":" + t.original;
      if (cacheTranslations[k]) {
        translations.set(t.id, cacheTranslations[k]);
        localCacheMatches++;
      }
    }
  }

  for (const t of texts) {
    if (translations.has(t.id)) continue;

    if (globalLangCache[t.clean]) {
      translations.set(t.id, globalLangCache[t.clean]);
      globalCacheMatches++;
      continue;
    }

    const commonTr = getCommonTranslation(t.clean, sl, tl, commonTrans);
    if (commonTr) {
      translations.set(t.id, commonTr);
      commonMatches++;
    }
  }

  global.log(
    "info",
    `Resultado do cache: matched ${localCacheMatches} do cache local do jogo, ${globalCacheMatches} do cache global, ${commonMatches} de termos comuns.`
  );

  const unmatched = texts.filter((t) => !translations.has(t.id));
  if (unmatched.length > 0) {
    global.log(
      "info",
      `Traduzindo os ${unmatched.length} textos inéditos restantes usando motor ${engine} (Idioma: ${sl} -> ${tl})...`
    );
    const glossary = loadGlossary();
    let savedCount = 0;
    const newTranslations = await translateBatch(
      unmatched,
      sl,
      tl,
      engine,
      glossary,
      (toSaveChunk) => {
        if (toSaveChunk && toSaveChunk.length > 0) {
          saveNewGlobalTranslations(sl, tl, toSaveChunk);
          savedCount += toSaveChunk.length;
        }
      }
    );

    const toSave = [];
    for (const [id, tr] of newTranslations) {
      translations.set(id, tr);
      const item = unmatched.find((x) => x.id === id);
      if (item && tr && tr !== item.clean && tr.length > 0) {
        toSave.push([item.clean, tr]);
      }
    }
    if (toSave.length > savedCount) {
      saveNewGlobalTranslations(sl, tl, toSave);
    }
    global.log(
      "info",
      `Cache global SQLite atualizado incrementalmente com ${toSave.length} novas traduções.`
    );
  }

  try {
    const cd = { cfgKey, translations: {} };
    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr && tr !== t.clean && tr.length > 0) {
        cd.translations[t.file + ":" + t.keys.join(".") + ":" + t.original] =
          tr;
      }
    }
    fs.writeFileSync(cacheFile, JSON.stringify(cd, null, 2));
    global.log("info", "Cache local salvo em: " + cacheFile);
  } catch (e) {
    global.log("error", "Falha ao salvar cache local: " + e.message);
  }

  global.log("info", "Aplicando patches nos arquivos de dados do jogo...");
  const patched = patchGameData(gameDir, texts, translations);
  global.log(
    "success",
    `Pipeline concluído. Substituídos ${patched} textos nos arquivos do jogo.`
  );

  const dataDir = findDataDir(gameDir);
  if (dataDir) {
    const wwwDir = path.dirname(dataDir);
    const htmlPath = path.join(wwwDir, "index.html");
    if (fs.existsSync(htmlPath)) {
      try {
        let html = fs.readFileSync(htmlPath, "utf8");
        if (!html.includes("CheatOverlay.js")) {
          html = html.replace(
            "</head>",
            '<script type="text/javascript" src="CheatOverlay.js"></script></head>'
          );
          fs.writeFileSync(htmlPath, html, "utf8");
        }
        const cheatScriptPath = path.join(wwwDir, "CheatOverlay.js");
        const templatePath = path.join(global.ROOT, "templates", "CheatOverlayTemplate.js");
        if (fs.existsSync(templatePath)) {
          fs.copyFileSync(templatePath, cheatScriptPath);
          global.log("success", "CheatOverlay injetado com sucesso no jogo.");
        }
      } catch (e) {
        global.log("error", "Falha ao injetar CheatOverlay: " + e.message);
      }
    }
  }
  return bakDir;
}

function getValueAtPath(obj, pathArr) {
  let cur = obj;
  for (const key of pathArr) {
    if (cur && typeof cur === "object" && key in cur) cur = cur[key];
    else return undefined;
  }
  return cur;
}

module.exports = {
  ENGINES_DEF,
  findDataDir,
  detectEngine,
  getExeArch,
  getHookDll,
  autoWrapText,
  patchGameData,
  backupGameData,
  restoreGameData,
  restoreOldestBackup,
  checkProcessRunning,
  findGameOnDisk,
  runPythonScript,
  healGameData,
  executeTranslationPipeline
};
