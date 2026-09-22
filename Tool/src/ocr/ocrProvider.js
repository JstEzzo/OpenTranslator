/**
 * OpenTranslator — OCRProvider 2.0
 * Módulo de OCR com regiões adaptativas (dialogue, subtitle, menu),
 * filtro de estabilidade de frames (debounce para digitação) e cache por hash de região.
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

class OCRProvider {
  constructor(options = {}) {
    this.ocrCache = new Map();
    this.lastFrameHash = "";
    this.consecutiveFrames = 0;
    this.stabilityThreshold = options.stabilityThreshold || 3;
    this.debounceMs = options.debounceMs || 250;
    this.lastCaptureTime = 0;
  }

  getImageHash(imageBuffer) {
    return crypto.createHash("md5").update(imageBuffer).digest("hex");
  }

  /**
   * Retorna os limites da região para recorte de tela baseado em presets comuns de jogos.
   */
  getPresetBounds(preset, screenWidth = 1920, screenHeight = 1080) {
    switch (preset) {
      case "dialogue":
        // Terço inferior (caixa de diálogo padrão de VNs e RPGs)
        return {
          left: Math.floor(screenWidth * 0.05),
          top: Math.floor(screenHeight * 0.65),
          width: Math.floor(screenWidth * 0.90),
          height: Math.floor(screenHeight * 0.32)
        };
      case "subtitle":
        // Faixa central inferior (legendas de cutscenes)
        return {
          left: Math.floor(screenWidth * 0.15),
          top: Math.floor(screenHeight * 0.78),
          width: Math.floor(screenWidth * 0.70),
          height: Math.floor(screenHeight * 0.18)
        };
      case "menu":
        // Painel esquerdo/central (menus e escolhas)
        return {
          left: Math.floor(screenWidth * 0.10),
          top: Math.floor(screenHeight * 0.15),
          width: Math.floor(screenWidth * 0.40),
          height: Math.floor(screenHeight * 0.70)
        };
      case "fullscreen":
      default:
        return {
          left: 0,
          top: 0,
          width: screenWidth,
          height: screenHeight
        };
    }
  }

  captureGameWindow(destImagePath, options = {}) {
    const now = Date.now();
    if (now - this.lastCaptureTime < this.debounceMs) {
      return { success: false, error: "Debounce ativo." };
    }
    this.lastCaptureTime = now;

    try {
      const preset = options.preset || "fullscreen";
      const target = destImagePath.replace(/\\/g, "\\\\");
      const script = [
        "Add-Type -AssemblyName System.Windows.Forms",
        "Add-Type -AssemblyName System.Drawing",
        "$bounds = [System.Windows.Forms.Screen]::PrimaryScreen.Bounds",
        "$bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)",
        "$g = [System.Drawing.Graphics]::FromImage($bmp)",
        "$g.CopyFromScreen($bounds.Left, $bounds.Top, 0, 0, $bounds.Size)",
        "$bmp.Save(\"" + target + "\", [System.Drawing.Imaging.ImageFormat]::Png)",
        "$g.Dispose()",
        "$bmp.Dispose()"
      ].join("; ");

      spawnSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", script], { encoding: "utf-8" });
      if (fs.existsSync(destImagePath) && fs.statSync(destImagePath).size > 500) {
        return { success: true, imagePath: destImagePath, preset };
      }
      return { success: false, error: "Falha ao capturar imagem da janela." };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Processa o frame capturado verificando a estabilidade antes de despachar para o OCR.
   * Evita traduzir frames parciais durante efeitos de animação 'typewriter'.
   */
  async processFrame(imagePath) {
    if (!fs.existsSync(imagePath)) {
      return { hasChanged: false, text: "", hash: "", isStable: false, fromCache: false };
    }
    const buf = fs.readFileSync(imagePath);
    const hash = this.getImageHash(buf);

    if (hash === this.lastFrameHash) {
      this.consecutiveFrames++;
    } else {
      this.lastFrameHash = hash;
      this.consecutiveFrames = 1;
    }

    const isStable = this.consecutiveFrames >= this.stabilityThreshold;

    if (this.ocrCache.has(hash)) {
      return {
        hasChanged: false,
        text: this.ocrCache.get(hash),
        hash,
        isStable: true,
        fromCache: true
      };
    }

    return {
      hasChanged: true,
      text: "",
      hash,
      isStable,
      consecutiveFrames: this.consecutiveFrames,
      fromCache: false
    };
  }

  setCache(hash, text) {
    this.ocrCache.set(hash, text);
  }
}

module.exports = OCRProvider;
