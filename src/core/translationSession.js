/**
 * OpenTranslator — TranslationSession & GameProfile
 * 
 * Gerenciador de sessão persistente e perfil de jogo:
 * - Salva e restaura o estado de trabalho entre reinicializações do OpenTranslator
 * - GameProfile: armazena estratégias bem-sucedidas, regras e preferências por jogo
 * - Version-Aware: detecta atualizações do jogo marcando status de migração
 */

const fs = require('fs');
const path = require('path');

class GameProfile {
  constructor(params = {}) {
    this.gameId = params.gameId || 'game';
    this.gameHash = params.gameHash || '';
    this.version = params.version || '1.0';
    this.engine = params.engine || 'generic';
    this.runtime = params.runtime || 'unknown';
    this.framework = params.framework || 'unknown';
    this.architecture = params.architecture || 'x64';
    this.preferredMethod = params.preferredMethod || 'METHOD_F_OVERLAY';
    this.fontPreference = params.fontPreference || null;
    this.rules = params.rules || [];
    this.knownSuccessfulStrategies = params.knownSuccessfulStrategies || [];
    this.updatedAt = params.updatedAt || Date.now();
  }

  /**
   * Avalia drift de versão entre o perfil salvo e uma nova instalação
   */
  checkVersionDrift(currentVersion, currentHash) {
    const isSameVersion = (this.version === currentVersion);
    const isSameHash = (this.gameHash === currentHash);

    return {
      hasDrift: !isSameVersion || !isSameHash,
      previousVersion: this.version,
      currentVersion,
      hashChanged: !isSameHash,
      action: !isSameVersion ? 'MIGRATE_AND_REVALIDATE' : 'KEEP_CURRENT'
    };
  }
}

class TranslationSession {
  constructor(options = {}) {
    this.sessionsDir = options.sessionsDir || path.resolve(__dirname, '../../data/sessions');
    if (!fs.existsSync(this.sessionsDir)) {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    }
  }

  /**
   * Salva a sessão ativa para persistência em disco
   */
  saveSession(sessionData) {
    const id = sessionData.gameHash || sessionData.gameId || 'default';
    const filePath = path.join(this.sessionsDir, `${id}.json`);

    const payload = {
      ...sessionData,
      savedAt: Date.now()
    };

    fs.writeFileSync(filePath, JSON.stringify(payload, null, 2), 'utf8');
    return { success: true, path: filePath };
  }

  /**
   * Carrega e restaura uma sessão anterior
   */
  loadSession(gameHashOrId) {
    const filePath = path.join(this.sessionsDir, `${gameHashOrId}.json`);
    if (!fs.existsSync(filePath)) {
      return null;
    }

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return data;
    } catch (e) {
      return null;
    }
  }
}

module.exports = {
  TranslationSession,
  GameProfile
};
