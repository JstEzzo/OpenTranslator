/**
 * testPaths.js - Centralized Test Fixture Path Resolver
 * 
 * Provides portable discovery of lab fixtures and test games.
 * Supports:
 *   - process.env.OPENTRANSLATOR_LAB
 *   - process.env.LAB_ROOT
 *   - Local adjacent OpenTranslator-Lab directory
 *   - Legacy lab fallback (Desktop/Nova pasta)
 */

const path = require('path');
const fs = require('fs');

function getLabCandidates() {
  const candidates = [];
  if (process.env.OPENTRANSLATOR_LAB) candidates.push(process.env.OPENTRANSLATOR_LAB);
  if (process.env.LAB_ROOT) candidates.push(process.env.LAB_ROOT);
  
  // Sibling directory OpenTranslator-Lab
  candidates.push(path.resolve(__dirname, '../../../OpenTranslator-Lab'));
  candidates.push(path.resolve(__dirname, '../../../OpenTranslator-Lab/games'));
  candidates.push(path.resolve(__dirname, '../../../OpenTranslator-Lab/fixtures'));
  candidates.push(path.resolve(__dirname, '../../../../OpenTranslator-Lab'));
  candidates.push(path.resolve(__dirname, '../../../../OpenTranslator-Lab/games'));
  candidates.push(path.resolve(__dirname, '../../../../OpenTranslator-Lab/fixtures'));
  
  // Legacy test lab location
  candidates.push('C:/Users/Teste/Desktop/Nova pasta');
  candidates.push('C:\\Users\\Teste\\Desktop\\Nova pasta');
  
  return candidates;
}

function resolveGame(gameName) {
  const candidates = getLabCandidates();
  for (const c of candidates) {
    if (!c) continue;
    const direct = path.join(c, gameName);
    if (fs.existsSync(direct)) return direct;
    
    // Check inside games/ or fixtures/ subdirectories
    const subGames = path.join(c, 'games', gameName);
    if (fs.existsSync(subGames)) return subGames;
    const subFixtures = path.join(c, 'fixtures', gameName);
    if (fs.existsSync(subFixtures)) return subFixtures;
  }
  return null;
}

function getTokiPath() {
  return resolveGame('Toki kan Yuusha (gitgud)');
}

function getRenpyPath() {
  return resolveGame('ArmoredSuitSolganteRenpy0.3-pc') ||
         resolveGame('ArmoredSuitSolganteRenpy0.2-pc') ||
         resolveGame('summertimesaga-21.0.0-wip.8189-pc');
}

function getLabRoot() {
  for (const c of getLabCandidates()) {
    if (fs.existsSync(c)) return c;
  }
  return getLabCandidates()[0] || path.resolve(__dirname, '../../../OpenTranslator-Lab');
}

function requireFixture(gameName) {
  const p = resolveGame(gameName);
  if (!p) {
    return {
      available: false,
      path: null,
      reason: 'LAB_FIXTURE_NOT_INSTALLED'
    };
  }
  return {
    available: true,
    path: p,
    reason: null
  };
}

module.exports = {
  getLabRoot,
  resolveGame,
  getTokiPath,
  getRenpyPath,
  requireFixture
};
