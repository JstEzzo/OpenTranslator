const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const p = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\[Kimochi] [RJ01156735] 刻印館からの脱出\\Resources\\data\\project.json';
const infoP = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\[Kimochi] [RJ01156735] 刻印館からの脱出\\Resources\\data\\info.json';

const info = JSON.parse(fs.readFileSync(infoP, 'utf8'));
console.log('Key in info.json:', info.key);
const keyBuf = Buffer.from(info.key, 'base64');
console.log('Key length in bytes:', keyBuf.length);

const raw = fs.readFileSync(p);
console.log('project.json length:', raw.length);
console.log('First 16 bytes:', raw.slice(0, 16));

// Check if starts with "enc\n"
if (raw.slice(0, 4).toString() === 'enc\n') {
    const cipherData = raw.slice(4);
    // Try AES ciphers: aes-128-ecb, aes-128-cbc with null IV or first 16 bytes as IV
    const ciphers = ['aes-128-ecb', 'aes-128-cbc'];
    for (const c of ciphers) {
        try {
            if (c === 'aes-128-ecb') {
                const decipher = crypto.createDecipheriv('aes-128-ecb', keyBuf, null);
                decipher.setAutoPadding(true);
                const decrypted = Buffer.concat([decipher.update(cipherData), decipher.final()]);
                console.log(`Success with ${c}! First 100 chars:`, decrypted.slice(0, 100).toString('utf8'));
                break;
            } else if (c === 'aes-128-cbc') {
                // Try IV = first 16 bytes
                const iv = cipherData.slice(0, 16);
                const actualData = cipherData.slice(16);
                const decipher = crypto.createDecipheriv('aes-128-cbc', keyBuf, iv);
                const decrypted = Buffer.concat([decipher.update(actualData), decipher.final()]);
                console.log(`Success with ${c}! First 100 chars:`, decrypted.slice(0, 100).toString('utf8'));
                break;
            }
        } catch(e) {
            console.log(`Failed with ${c}:`, e.message);
        }
    }
}
