const fs = require('fs');
const path = require('path');

const auditRoot = path.join(__dirname, '_open_translator_audit');
const gamesDir = path.join(auditRoot, 'games');

if (!fs.existsSync(auditRoot)) fs.mkdirSync(auditRoot, { recursive: true });
if (!fs.existsSync(gamesDir)) fs.mkdirSync(gamesDir, { recursive: true });

console.log('Created audit root:', auditRoot);
