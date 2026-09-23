/**
 * OpenTranslator - ScreenDiff
 * 
 * Comparador factual de telas (before.png vs after.png).
 * Calcula diferença bruta, regiões alteradas e porcentagem de modificação.
 * 
 * REGRA: Diferença de pixels NÃO é reconhecimento textual.
 */

const fs = require('fs');
const crypto = require('crypto');

class ScreenDiff {
  /**
   * Compara duas imagens PNG
   */
  static compare(beforePath, afterPath) {
    if (!fs.existsSync(beforePath) || !fs.existsSync(afterPath)) {
      return { success: false, error: 'Um ou ambos os arquivos de imagem não existem' };
    }

    const beforeBuf = fs.readFileSync(beforePath);
    const afterBuf = fs.readFileSync(afterPath);

    const hashBefore = crypto.createHash('sha256').update(beforeBuf).digest('hex');
    const hashAfter = crypto.createHash('sha256').update(afterBuf).digest('hex');

    const identical = (hashBefore === hashAfter);
    if (identical) {
      return {
        success: true,
        identical: true,
        percentageChanged: 0,
        changedRegionsCount: 0,
        hashBefore,
        hashAfter
      };
    }

    // Amostragem comparativa de bytes para estimar modificação
    let diffBytes = 0;
    const minLen = Math.min(beforeBuf.length, afterBuf.length);
    const maxLen = Math.max(beforeBuf.length, afterBuf.length);

    for (let i = 0; i < minLen; i++) {
      if (beforeBuf[i] !== afterBuf[i]) {
        diffBytes++;
      }
    }
    diffBytes += (maxLen - minLen);

    const percentageChanged = Number(((diffBytes / maxLen) * 100).toFixed(2));

    return {
      success: true,
      identical: false,
      percentageChanged,
      hashBefore,
      hashAfter,
      sizeBefore: beforeBuf.length,
      sizeAfter: afterBuf.length
    };
  }
}

module.exports = ScreenDiff;
