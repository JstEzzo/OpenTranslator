"use strict";
// Google requests use POST bodies: URL escaping is not the payload size.
const SEPARATOR = " [|] ";
function plan(entries, {maxCharacters=3000,maxBytes=12000,maxItems=32}={}) {
  const batches=[],oversized=[];let batch=[],characters=0,bytes=0;
  const flush=()=>{if(batch.length)batches.push(batch);batch=[];characters=0;bytes=0;};
  for(const entry of entries){const source=entry[0],length=[...source].length,size=Buffer.byteLength(source,'utf8');
    if(length>maxCharacters||size>maxBytes){oversized.push(entry);continue;}
    const extra=batch.length?SEPARATOR.length:0;
    if(batch.length && (characters+extra+length>maxCharacters||bytes+extra+size>maxBytes||batch.length>=maxItems))flush();
    const separator=batch.length?SEPARATOR.length:0;batch.push(entry);characters+=separator+length;bytes+=separator+size;
  }flush();return {batches,oversized};
}
module.exports={plan,SEPARATOR};
