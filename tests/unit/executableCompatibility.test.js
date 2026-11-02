"use strict";
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { readExecutableInfo, executableBits } = require("../../src/core/executableInfo");
const Detector = require("../../src/core/engineDetector");
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "opent-compat-"));
async function main() {
  let passed = 0;
  try {
    for (const [machine, architecture, bits] of [[0x14c,"x86",32],[0x8664,"x64",64],[0xaa64,"arm64",64]]) {
      const bytes = Buffer.alloc(256); bytes.write("MZ"); bytes.writeUInt32LE(128,60); bytes.write("PE\0\0",128); bytes.writeUInt16LE(machine,132);
      const file = path.join(dir, "game.exe"); fs.writeFileSync(file,bytes);
      assert.deepStrictEqual(readExecutableInfo(file), {architecture,bits});
      assert.strictEqual(executableBits(file), architecture === "arm64" ? null : bits); passed++;
    }
    for (const bytes of [Buffer.alloc(0),Buffer.alloc(64),Buffer.from("not a PE executable")]) {
      const file = path.join(dir,"game.exe"); fs.writeFileSync(file,bytes); assert.strictEqual(readExecutableInfo(file),null); passed++;
    }
    const broken = Buffer.alloc(64); broken.write("MZ"); broken.writeUInt32LE(0xffffffff,60);
    fs.writeFileSync(path.join(dir,"game.exe"),broken); assert.strictEqual(Detector.getExeArch(path.join(dir,"game.exe")),null); passed++;
    fs.mkdirSync(path.join(dir,"game")); fs.writeFileSync(path.join(dir,"game","script.rpy"),"label start:");
    const found = await Detector.detect(dir); assert.strictEqual(found.engine,"renpy"); assert.strictEqual(found.engineVersion,"unknown"); assert.strictEqual(found.architecture,"unknown"); passed++;
    fs.mkdirSync(path.join(dir,"lib","py3-windows-aarch64"),{recursive:true});
    const modern = await Detector.detect(dir); assert.strictEqual(modern.engineVersion,"8.x"); assert.strictEqual(modern.architecture,"unknown"); passed++;
    fs.rmSync(path.join(dir,"game"),{recursive:true}); fs.rmSync(path.join(dir,"lib"),{recursive:true});
    fs.mkdirSync(path.join(dir,"www","data"),{recursive:true});
    const arbitrary = await Detector.detect(dir); assert.notStrictEqual(arbitrary.engine,"mv"); passed++;
    fs.mkdirSync(path.join(dir,"js")); fs.writeFileSync(path.join(dir,"js","rmmz_core.js"), 'Utils.RPGMAKER_VERSION = "1.8.1";');
    const mz = await Detector.detect(dir); assert.strictEqual(mz.engine,"mz"); assert.strictEqual(mz.engineVersion,"MZ 1.8.1"); passed++;
    const unityDir = path.join(dir, 'unity-fixture'); fs.mkdirSync(path.join(unityDir, 'Game_Data'), { recursive: true });
    const player = Buffer.alloc(256); player.write('MZ'); player.writeUInt32LE(128,60); player.write('PE\0\0',128); player.writeUInt16LE(0x8664,132);
    player.write('2018.3.0a1',200); fs.writeFileSync(path.join(unityDir,'UnityPlayer.dll'),player); fs.writeFileSync(path.join(unityDir,'Game.exe'),player);
    const arbitraryUnityString = await Detector.detect(unityDir);
    assert.strictEqual(arbitraryUnityString.engine, 'unity');
    assert.strictEqual(arbitraryUnityString.exactVersion, null, 'An arbitrary version-like DLL string is not player version metadata'); passed++;
    console.log(`pass=${passed} fail=0`);
  } finally { fs.rmSync(dir,{recursive:true,force:true}); }
}
main().catch(e=>{console.error(e);console.log("pass=0 fail=1");process.exitCode=1;});
