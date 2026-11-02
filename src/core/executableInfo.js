"use strict";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require('child_process');
const versionCache = new Map();
// A bit count alone cannot distinguish ARM64 from AMD64.
function readExecutableInfo(file) {
  let fd;
  try {
    fd = fs.openSync(file, "r");
    const size = fs.fstatSync(fd).size;
    const header = Buffer.alloc(64);
    if (fs.readSync(fd, header, 0, 64, 0) !== 64 || header.readUInt16LE(0) !== 0x5a4d) return null;
    const offset = header.readUInt32LE(60);
    if (offset < 64 || offset > size - 6) return null;
    const pe = Buffer.alloc(6);
    if (fs.readSync(fd, pe, 0, 6, offset) !== 6 || pe.readUInt32LE(0) !== 0x4550) return null;
    return { 332: { architecture: "x86", bits: 32 }, 34404: { architecture: "x64", bits: 64 },
      43620: { architecture: "arm64", bits: 64 } }[pe.readUInt16LE(4)] || null;
  } catch (_) { return null; }
  finally { if (fd !== undefined) fs.closeSync(fd); }
}
function executableBits(file) {
  const info = readExecutableInfo(file);
  return info && info.architecture !== "arm64" ? info.bits : null;
}
function readExecutableVersion(file) {
  if (process.platform !== 'win32' || !readExecutableInfo(file)) return null;
  try {
    const full = path.resolve(file), stat = fs.statSync(full);
    const key = `${full}:${stat.size}:${stat.mtimeMs}`;
    if (versionCache.has(key)) return versionCache.get(key);
    const shell = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe');
    // The filename is passed as data, never interpolated into a shell command.
    // GetVersionInfo reads the resource; it does not execute the game or DLL.
    const command = '$ErrorActionPreference="Stop"; $v=[System.Diagnostics.FileVersionInfo]::GetVersionInfo($env:OPENT_VERSION_PROBE_FILE); @{productName=$v.ProductName;productVersion=$v.ProductVersion;fileVersion=$v.FileVersion} | ConvertTo-Json -Compress';
    const result = JSON.parse(execFileSync(shell, ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command], {
      env: { ...process.env, OPENT_VERSION_PROBE_FILE: full }, windowsHide: true,
      encoding: 'utf8', timeout: 5000, maxBuffer: 16384,
    }).replace(/^\uFEFF/, ''));
    if (versionCache.size >= 128) versionCache.delete(versionCache.keys().next().value);
    versionCache.set(key, result);
    return result;
  } catch (_) { return null; }
}
module.exports = { readExecutableInfo, executableBits, readExecutableVersion };
