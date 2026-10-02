const fs = require('fs');
const path = require('path');

const samplePath = 'C:\\Users\\Teste\\Desktop\\Nova pasta\\BLACK SOULS\\TrsData.bin';
if (fs.existsSync(samplePath)) {
    const buf = fs.readFileSync(samplePath);
    console.log('Size of TrsData.bin:', buf.length);
    console.log('Header bytes (hex):', buf.slice(0, 32).toString('hex'));
    console.log('Header bytes (ascii):', buf.slice(0, 64).toString('binary').replace(/[^\x20-\x7e]/g, '.'));
    
    // Check if it's zlib compressed
    try {
        const zlib = require('zlib');
        const decomp = zlib.inflateSync(buf);
        console.log('Decompressed size:', decomp.length);
        console.log('Decompressed sample:', decomp.slice(0, 200).toString('utf8'));
    } catch(e) {
        console.log('Not standard zlib:', e.message);
    }
} else {
    console.log('Sample file not found');
}
