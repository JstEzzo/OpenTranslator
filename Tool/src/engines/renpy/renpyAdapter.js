const RenpyParser = require("./renpyParser");
/**
 * OpenTranslator — RenpyAdapter
 * Adaptador oficial e canônico para o motor Ren'Py (Ren'Py 6, 7 e 8).
 *
 * Utiliza o sistema nativo de traduções do Ren'Py (game/tl/<lang>/) com blocos:
 * translate <lang> strings:
 *     old "..."
 *     new "..."
 *
 * Preserva 100% dos scripts originais (.rpy / .rpyc / .rpa), suporta descompilação segura,
 * injeção de fontes UTF-8 e rollback instantâneo e sem riscos.
 */

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const BaseEngineAdapter = require("../../core/baseEngineAdapter");
const CodeProtector = require("../../core/codeProtector");
const BackupManager = require("../../core/backupManager");
const { extractRenpyRpyTexts, formatRenpyStringLiteral, unescapeRenpyString } = require("./renpyCommon");

class RenpyAdapter extends BaseEngineAdapter {
  constructor() {
    super("renpy", "Ren'Py Visual Novel Engine");
    this.codeProtector = new CodeProtector({ engine: "renpy" });
    this.backupManager = new BackupManager();
  }

  /**
   * Localiza o executável Python embutido no OpenTranslator.
   */
  getEmbeddedPython() {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    const embeddedPy = path.join(root, "resources", "renpy", "python", "python.exe");
    if (fs.existsSync(embeddedPy)) return embeddedPy;
    return "python";
  }

  /**
   * Localiza o script de desempacotamento/descompilação oficial.
   */
  getUnpackerScript() {
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    return path.join(root, "resources", "renpy", "unpack_renpy_all.py");
  }

  getCapabilities(gameDir, exePath) {
    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;
    let hasRpa = false;
    let hasRpyc = false;
    let hasRpy = false;

    try {
      const files = fs.readdirSync(gameSubDir).map(f => f.toLowerCase());
      hasRpa = files.some(f => f.endsWith(".rpa"));
      hasRpyc = files.some(f => f.endsWith(".rpyc"));
      hasRpy = files.some(f => f.endsWith(".rpy"));
    } catch (e) {}

    return {
      staticFiles: hasRpy || hasRpyc,
      nativeLocalization: true, // Sistema tl/<lang> nativo oficial do Ren'Py
      archives: hasRpa,
      compiledScripts: hasRpyc,
      runtimeHook: false, // Desnecessário e instável; injeção nativa via tl/ é perfeita
      dom: false,
      frameworkState: false,
      ocr: true,
      backupSupported: true
    };
  }

  /**
   * Descompila arquivos .rpyc e desempacota .rpa se necessário para extrair as strings.
   */
  async unpackAndDecompile(gameDir) {
    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;
    const pythonExe = this.getEmbeddedPython();
    const unpackScript = this.getUnpackerScript();

    if (!fs.existsSync(unpackScript)) {
      return { success: false, error: "Script unpack_renpy_all.py não encontrado." };
    }

    try {
      const args = [unpackScript, "-i", gameSubDir, "-o", gameSubDir];
      const res = spawnSync(pythonExe, args, {
        cwd: gameDir,
        encoding: "utf-8",
        maxBuffer: 50 * 1024 * 1024
      });

      return {
        success: res.status === 0,
        stdout: res.stdout,
        stderr: res.stderr
      };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Extrai todos os textos traduzíveis dos scripts .rpy (soltos ou descompilados).
   */
  async extract(gameDir, options = {}) {
    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;

    // 1. Verifica se há arquivos .rpy; se não houver ou houver .rpyc mais recentes, descompila
    const files = fs.readdirSync(gameSubDir);
    const rpyFiles = files.filter(f => f.toLowerCase().endsWith(".rpy") && !f.startsWith("00_") && !f.startsWith("000_"));
    const rpycFiles = files.filter(f => f.toLowerCase().endsWith(".rpyc"));
    const rpaFiles = files.filter(f => f.toLowerCase().endsWith(".rpa"));

    if (rpyFiles.length === 0 && (rpycFiles.length > 0 || rpaFiles.length > 0)) {
      if (global.log) global.log("info", "Ren'Py: Desempacotando RPA e descompilando scripts RPYC com o motor oficial...");
      await this.unpackAndDecompile(gameDir);
    }

    // 2. Escaneia recursivamente todos os arquivos .rpy
    const allTexts = [];
    const scannedFiles = [];
    const seenStrings = new Set();

    const scanDirectory = (dir) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          // Ignora a pasta de traduções tl e a engine interna renpy
          if (entry.name !== "tl" && entry.name !== "renpy" && entry.name !== "cache") {
            scanDirectory(fullPath);
          }
        } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".rpy")) {
          // Ignora scripts de runtime e proteção
          if (entry.name.startsWith("00_opent_") || entry.name.startsWith("000_anti_") || entry.name.startsWith("opentranslator_")) {
            continue;
          }
          scannedFiles.push(fullPath);
          try {
            const content = fs.readFileSync(fullPath, "utf-8");
            const entries = extractRenpyRpyTexts(content, fullPath);
            for (const item of entries) {
              if (!seenStrings.has(item.clean)) {
                seenStrings.add(item.clean);
                // Protege códigos e tags
                const { protectedText, tokens } = this.codeProtector.protect(item.clean, "renpy");
                allTexts.push({
                  id: allTexts.length,
                  file: path.relative(gameDir, fullPath).replace(/\\/g, "/"),
                  original: item.clean,
                  clean: item.clean,
                  raw: item.raw,
                  protectedText,
                  tokens,
                  engine: "renpy"
                });
              }
            }
          } catch (e) {
            if (global.log) global.log("warn", `Falha ao ler script ${entry.name}: ${e.message}`);
          }
        }
      }
    };

    scanDirectory(gameSubDir);

    return {
      success: true,
      texts: allTexts,
      count: allTexts.length,
      scannedFilesCount: scannedFiles.length
    };
  }

  /**
   * Valida integridade das traduções antes da aplicação.
   */
  async validate(gameDir, texts, translations) {
    const errors = [];
    const warnings = [];

    for (const t of texts) {
      const tr = translations.get(t.id);
      if (tr && t.tokens && t.tokens.length > 0) {
        const { valid, missingTokens } = this.codeProtector.restore(tr, t.tokens);
        if (!valid) {
          warnings.push(`Texto [ID ${t.id}] teve ${missingTokens.length} tags protegidas perdidas na tradução.`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Aplica as traduções gerando o arquivo canônico em game/tl/<lang>/opentranslator.rpy.
   * Não altera 1 byte dos arquivos originais do jogo.
   */
  async apply(gameDir, texts, translations, options = {}) {
    const lang = options.lang || "pt_BR";
    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;

    const targetLangs = (lang === "pt_BR" || lang === "pt") ? ["pt_BR", "pt"] : [lang];
    const modifiedFiles = [];
    let appliedCount = 0;

    for (const curLang of targetLangs) {
      const tlDir = path.join(gameSubDir, "tl", curLang);
      if (!fs.existsSync(tlDir)) {
        fs.mkdirSync(tlDir, { recursive: true });
      }

      let tlContent = `# OpenTranslator Generated Translation File - ${curLang}\n`;
      tlContent += `# Generated: ${new Date().toISOString()}\n`;
      tlContent += `# Non-destructive Canonical Ren'Py Translation\n\n`;
      tlContent += `translate ${curLang} strings:\n\n`;

      for (const t of texts) {
        let tr = translations.get(t.id);
        if (!tr || tr === t.clean || tr.trim().length === 0) continue;

        // Se o texto possuía tokens protegidos, restaura
        if (t.tokens && t.tokens.length > 0) {
          const restored = this.codeProtector.restore(tr, t.tokens);
          tr = restored.restoredText;
        }

        const oldFormatted = formatRenpyStringLiteral(t.clean);
        const newFormatted = formatRenpyStringLiteral(tr);

        tlContent += `    # File: ${t.file}\n`;
        tlContent += `    old ${oldFormatted}\n`;
        tlContent += `    new ${newFormatted}\n\n`;
        appliedCount++;
      }

      const outFile = path.join(tlDir, "opentranslator_tl.rpy");
      const outFileC = path.join(tlDir, "opentranslator_tl.rpyc");

      // Remove .rpyc antigo compilado de tradução se existir para forçar recompilação limpa do Ren'Py
      if (fs.existsSync(outFileC)) {
        try { fs.unlinkSync(outFileC); } catch (e) {}
      }

      // Validação Sintática Pré-Apply via RenpyParser
      const rpyCheck = RenpyParser.validateRpy(tlContent);
      if (!rpyCheck.valid) {
        if (global.log) global.log("error", "Ren'Py AST Validation falhou: " + rpyCheck.errors.join("; "));
        return { success: false, error: "Falha na validação sintática do arquivo Ren'Py: " + rpyCheck.errors[0], modifiedFiles: [] };
      }
      fs.writeFileSync(outFile, tlContent, "utf-8");
      modifiedFiles.push(outFile);
    }

    // Aplica patch de fonte UTF-8 para PT-BR em gui.rpy se disponível
    const root = global.ROOT || path.resolve(__dirname, "../../..");
    const fontSrc = path.join(root, "loaders", "opent_PGMMV_font.ttf");
    if (fs.existsSync(fontSrc)) {
      const fontsDir = path.join(gameSubDir, "fonts");
      if (!fs.existsSync(fontsDir)) fs.mkdirSync(fontsDir, { recursive: true });
      const destFont = path.join(fontsDir, "opentranslator_font.ttf");
      if (!fs.existsSync(destFont)) {
        fs.copyFileSync(fontSrc, destFont);
      }
    }

    return {
      success: true,
      modifiedFiles,
      count: appliedCount
    };
  }

  /**
   * Rollback limpo e imediato: remove os arquivos gerados em game/tl/pt_BR/ e restaura a sessão original.
   */
  async rollback(gameDir, options = {}) {
    const gameSubDir = fs.existsSync(path.join(gameDir, "game")) ? path.join(gameDir, "game") : gameDir;
    const restoredFiles = [];

    const langs = ["pt_BR", "pt"];
    for (const l of langs) {
      const targetRpy = path.join(gameSubDir, "tl", l, "opentranslator_tl.rpy");
      const targetRpyc = path.join(gameSubDir, "tl", l, "opentranslator_tl.rpyc");
      if (fs.existsSync(targetRpy)) {
        fs.unlinkSync(targetRpy);
        restoredFiles.push(targetRpy);
      }
      if (fs.existsSync(targetRpyc)) {
        fs.unlinkSync(targetRpyc);
        restoredFiles.push(targetRpyc);
      }
    }

    return {
      success: true,
      restoredFiles
    };
  }
}

module.exports = RenpyAdapter;
