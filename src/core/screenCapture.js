/**
 * OpenTranslator - ScreenCapture (Windows Real Screen Capture)
 * 
 * Captura factual da tela do jogo ou do desktop no Windows via .NET System.Drawing.
 * Se o ambiente for headless, background service ou não possuir handle de desktop interativo,
 * retorna explicitamente SCREEN_CAPTURE_UNAVAILABLE sem inventar dados ou hashes falsos.
 */

const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class ScreenCapture {
  constructor(options = {}) {
    this.outputDir = options.outputDir || path.resolve(__dirname, '../../data/evidence/screens');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Captura a tela inteira ou janela alvo
   * @param {object} options - { mode: 'FULL_SCREEN'|'WINDOW'|'REGION', windowHandle, region, sessionId, pid }
   */
  capture(options = {}) {
    const timestamp = Date.now();
    const sessionId = options.sessionId || 'nosess';
    const targetFile = path.join(this.outputDir, `screen_${sessionId}_${timestamp}.png`);

    if (process.platform !== 'win32') {
      return {
        success: false,
        reason: 'SCREEN_CAPTURE_UNAVAILABLE',
        error: `Plataforma não suportada: ${process.platform}`
      };
    }

    try {
      const psScript = `
        Add-Type -AssemblyName System.Drawing, System.Windows.Forms
        try {
          $screen = [System.Windows.Forms.Screen]::PrimaryScreen
          if (!$screen) {
            Write-Output "NO_SCREEN"
            exit 1
          }
          $bounds = $screen.Bounds
          $bmp = New-Object System.Drawing.Bitmap($bounds.Width, $bounds.Height)
          $gfx = [System.Drawing.Graphics]::FromImage($bmp)
          $gfx.CopyFromScreen($bounds.Location, [System.Drawing.Point]::Empty, $bounds.Size)
          $bmp.Save('${targetFile.replace(/\\/g, '\\\\')}', [System.Drawing.Imaging.ImageFormat]::Png)
          $gfx.Dispose()
          $bmp.Dispose()
          @{ Success = $true; Width = $bounds.Width; Height = $bounds.Height } | ConvertTo-Json -Compress
        } catch {
          @{ Success = $false; Error = $_.Exception.Message } | ConvertTo-Json -Compress
        }
      `;

      const res = spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', psScript], {
        encoding: 'utf8',
        timeout: 8000
      });

      const stdout = (res.stdout || '').trim();
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch (e) {
        // Output não estruturado
      }

      if (parsed && parsed.Success && fs.existsSync(targetFile)) {
        const buf = fs.readFileSync(targetFile);
        if (buf.length > 500) {
          const imageHash = crypto.createHash('sha256').update(buf).digest('hex');
          return {
            success: true,
            imagePath: targetFile,
            imageHash,
            timestamp,
            width: parsed.Width,
            height: parsed.Height,
            windowHandle: options.windowHandle || null,
            pid: options.pid || null,
            sessionId,
            region: options.region || 'FULL_SCREEN'
          };
        }
      }

      // Se falhou, limpa arquivo temporário se gerado incorretamente
      if (fs.existsSync(targetFile)) {
        try { fs.unlinkSync(targetFile); } catch (e) {}
      }

      return {
        success: false,
        reason: 'SCREEN_CAPTURE_UNAVAILABLE',
        error: parsed?.Error || res.stderr || 'Desktop session handle unavailable or headless environment'
      };

    } catch (err) {
      if (fs.existsSync(targetFile)) {
        try { fs.unlinkSync(targetFile); } catch (e) {}
      }
      return {
        success: false,
        reason: 'SCREEN_CAPTURE_UNAVAILABLE',
        error: err.message
      };
    }
  }
}

const defaultScreenCapture = new ScreenCapture();
module.exports = defaultScreenCapture;
module.exports.ScreenCapture = ScreenCapture;
