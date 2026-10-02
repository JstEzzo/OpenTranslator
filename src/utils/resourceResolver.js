const path = require('path');
const fs = require('fs');

/**
 * ResourceResolver: Central deterministic path resolver for OpenTranslator.
 * Eliminates all brittle hardcoded paths across the application.
 */
class ResourceResolver {
  constructor() {
    // Root directory of OpenTranslator
    this.rootDir = path.resolve(__dirname, '../../..');
    this.toolDir = path.resolve(__dirname, '../..');
    this.dataDir = path.resolve(this.rootDir, 'data');
    this.docsDir = path.resolve(this.rootDir, 'docs');
  }

  getRootDir() { return this.rootDir; }
  getToolDir() { return this.toolDir; }
  getDataDir(sub = '') { return path.join(this.dataDir, sub); }
  getDocsDir(sub = '') { return path.join(this.docsDir, sub); }

  getLoadersDir() {
    return path.join(this.toolDir, 'loaders');
  }

  getDatabaseDir() {
    const d = path.join(this.dataDir, 'database');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  getLogsDir() {
    const d = path.join(this.dataDir, 'logs');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  getStagingDir() {
    const d = path.join(this.dataDir, 'staging');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  getTransactionsDir() {
    const d = path.join(this.dataDir, 'transactions');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }

  getProfilesDir() {
    const d = path.join(this.dataDir, 'profiles');
    if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
    return d;
  }
}

module.exports = new ResourceResolver();
