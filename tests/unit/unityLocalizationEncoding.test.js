'use strict';
const path=require('path'),{spawnSync}=require('child_process');
const {resolvePythonBinary}=require('../../src/utils/pythonResolver');
const result=spawnSync(resolvePythonBinary(),[path.join(__dirname,'unityLocalizationEncoding.test.py')],{encoding:'utf8',windowsHide:true,timeout:30000});
process.stdout.write(result.stdout||'');process.stderr.write(result.stderr||'');if(result.error)console.error(result.error);process.exitCode=result.status===0?0:1;
