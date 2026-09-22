const fs = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');
const BaseEngineHandler = require('../baseEngineHandler');

class UnrealEngineHandler extends BaseEngineHandler {
  constructor() {
    super('UnrealEngineHandler');
    this.pakTools = {
      u4pak: path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'unreal', 'u4pak.exe'),
      unrealPak: path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'unreal', 'UnrealPak.exe'),
      ueExtractor: path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'unreal', 'UEExtractor.exe'),
      locresTool: path.join(global.ROOT || path.resolve(__dirname, '../../..'), 'resources', 'unreal', 'locres_tool.exe'),
    };
  }

  _findPakFiles(gameDir) {
    const pakFiles = [];
    const pakDirs = [
      path.join(gameDir, 'Content', 'Paks'),
      path.join(gameDir, 'Trover', 'Content', 'Paks'),
    ];

    for (const pakDir of pakDirs) {
      if (fs.existsSync(pakDir)) {
        const files = fs.readdirSync(pakDir);
        for (const f of files) {
          if (f.toLowerCase().endsWith('.pak')) {
            pakFiles.push(path.join(pakDir, f));
          }
        }
      }
    }

    return pakFiles;
  }

  _findLocresFiles(extractDir) {
    const locresFiles = [];
    const localesDir = path.join(extractDir, 'Localization');

    if (fs.existsSync(localesDir)) {
      const scan = (dir) => {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          const full = path.join(dir, entry.name);
          if (entry.isDirectory()) {
            scan(full);
          } else if (entry.name.toLowerCase().endsWith('.locres')) {
            locresFiles.push(full);
          }
        }
      };
      scan(localesDir);
    }

    return locresFiles;
  }

  async extract({ gameDir, gameExe, title, options = {} }) {
    if (!global.log) global.log = console.log;
    global.log('info', `[Unreal] Extracting locres from .pak files in ${gameDir}`);

    const pakFiles = this._findPakFiles(gameDir);
    if (pakFiles.length === 0) {
      global.log('warn', '[Unreal] No .pak files found in Content/Paks/');
      return { success: false, extractedFiles: [], totalEntries: 0, error: 'No .pak files found' };
    }

    const extractedFiles = [];
    let totalEntries = 0;

    for (const pakFile of pakFiles) {
      global.log('info', `[Unreal] Processing pak: ${path.basename(pakFile)}`);

      const extractDir = path.join(path.dirname(pakFile), '_unreal_extract');
      if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
      }

      let pakList = [];
      try {
        const listResult = spawnSync('python', [
          '-c',
          `
import subprocess, sys, os
pak = r"${pakFile}"
out = subprocess.run(['u4pak', 'list', pak], capture_output=True, text=True)
print(out.stdout)
print(out.stderr, file=sys.stderr)
`
        ], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });

        pakList = listResult.stdout ? listResult.stdout.split('\n').filter(l => l.trim()) : [];
      } catch (e) {
        global.log('warn', `[Unreal] u4pak list failed: ${e.message}`);
      }

      if (pakList.length === 0) {
        global.log('info', `[Unreal] u4pak failed, trying UEExtractor`);
        try {
          const extractResult = spawnSync(this.pakTools.ueExtractor || 'UEExtractor.exe', [gameDir], {
            encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024
          });
          global.log('info', `[Unreal] UEExtractor output: ${extractResult.stdout?.slice(0, 500)}`);
        } catch (e2) {
          global.log('error', `[Unreal] UEExtractor also failed: ${e2.message}`);
        }
        continue;
      }

      for (const entry of pakList) {
        if (entry.toLowerCase().endsWith('.locres')) {
          const locresRelativePath = entry.trim();
          global.log('info', `[Unreal] Extracting locres: ${locresRelativePath}`);

          const outFile = path.join(extractDir, locresRelativePath.replace(/[\\/]/g, '_'));
          if (!fs.existsSync(path.dirname(outFile))) {
            fs.mkdirSync(path.dirname(outFile), { recursive: true });
          }

          try {
            spawnSync('python', [
              '-c',
              `
import subprocess, sys
pak = r"${pakFile}"
f = r"${locresRelativePath}"
out = r"${outFile.replace(/\\/g, '/')}"
subprocess.run(['u4pak', 'extract', pak, f, out], capture_output=True, text=True)
`
            ], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });

            if (fs.existsSync(outFile)) {
              extractedFiles.push(outFile);
              global.log('info', `[Unreal] Extracted: ${outFile}`);
            }
          } catch (e) {
            global.log('warn', `[Unreal] Failed to extract ${locresRelativePath}: ${e.message}`);
          }
        }
      }

      const locresFiles = this._findLocresFiles(extractDir);
      extractedFiles.push(...locresFiles);

      for (const locresFile of locresFiles) {
        const csvFile = locresFile.replace(/\.locres$/, '.csv');
        try {
          spawnSync('python', [
            '-c',
            `
import sys
sys.path.insert(0, r"${path.dirname(this.pakTools.locresTool) || 'C:/Users/Teste/Desktop/Arquivos Switch/teste jogos/ferramentas/ue-localization-tools'}")
from locres_tool import decode
import typer
app = typer.Typer()
app.command("decode")(decode)
app()
`
          ], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });

          if (fs.existsSync(csvFile)) {
            extractedFiles.push(csvFile);
            global.log('info', `[Unreal] Decoded locres to CSV: ${csvFile}`);
          }
        } catch (e) {
          global.log('warn', `[Unreal] locres_tool decode failed: ${e.message}`);
        }
      }

      for (const f of extractedFiles) {
        if (f.endsWith('.csv')) {
          const content = fs.readFileSync(f, 'utf-8');
          totalEntries += content.split('\n').filter(l => l.includes('|') || l.includes(',')).length - 1;
        }
      }
    }

    return {
      success: extractedFiles.length > 0,
      extractedFiles,
      totalEntries,
      engine: 'UNREAL_ENGINE',
    };
  }

  async injectTranslation({ gameDir, translationMap, options = {} }) {
    if (!global.log) global.log = console.log;
    global.log('info', '[Unreal] Injecting translations into .locres files');

    const pakFiles = this._findPakFiles(gameDir);
    if (pakFiles.length === 0) {
      return { success: false, injectedFiles: [], count: 0, error: 'No .pak files found' };
    }

    let count = 0;
    const injectedFiles = [];

    for (const pakFile of pakFiles) {
      const extractDir = path.join(path.dirname(pakFile), '_unreal_extract');
      const csvFiles = this._findLocresFiles(extractDir).map(f => f.replace(/\.locres$/, '.csv'));

      for (const csvFile of csvFiles) {
        if (!fs.existsSync(csvFile)) continue;

        const locresFile = csvFile.replace(/\.csv$/, '.locres');

        try {
          spawnSync('python', [
            '-c',
            `
import sys
sys.path.insert(0, r"${path.dirname(this.pakTools.locresTool) || 'C:/Users/Teste/Desktop/Arquivos Switch/teste jogos/ferramentas/ue-localization-tools'}")
from locres_tool import encode
encode(r"${csvFile}", r"${locresFile}")
`
          ], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });

          if (fs.existsSync(locresFile)) {
            injectedFiles.push(locresFile);
            count++;
            global.log('info', `[Unreal] Encoded translations into: ${locresFile}`);
          }
        } catch (e) {
          global.log('warn', `[Unreal] Failed to encode ${csvFile}: ${e.message}`);
        }
      }
    }

    return { success: count > 0, injectedFiles, count };
  }

  async applyFontPatch({ gameDir, fontFile, options = {} }) {
    global.log('info', '[Unreal] Font patching not directly supported for .pak-based Unreal games.');
    return { success: false, patchedFiles: [], error: 'Font patching in UE .pak files requires custom asset editing tools.' };
  }

  async cleanup({ gameDir, options = {} }) {
    const pakFiles = this._findPakFiles(gameDir);
    for (const pakFile of pakFiles) {
      const extractDir = path.join(path.dirname(pakFile), '_unreal_extract');
      if (fs.existsSync(extractDir)) {
        fs.rmSync(extractDir, { recursive: true, force: true });
      }
    }
    return { success: true };
  }

  static detect(gameDir) {
    const pakFiles = this.prototype._findPakFiles(gameDir);
    if (pakFiles.length > 0) return true;

    if (fs.existsSync(path.join(gameDir, 'Content', 'Localization'))) return true;
    if (fs.existsSync(path.join(gameDir, 'Engine', 'Binaries'))) return true;
    if (fs.existsSync(path.join(gameDir, 'UE4-PrereqSetup_x64.exe'))) return true;

    return false;
  }
}

module.exports = UnrealEngineHandler;
