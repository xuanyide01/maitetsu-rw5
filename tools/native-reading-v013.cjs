const assert = require('node:assert/strict');
const {createHash} = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const {performance} = require('node:perf_hooks');
const {execFileSync} = require('node:child_process');

const root = path.resolve(__dirname, '..');
const log = path.resolve(root, '../maitetsu-native/emulator.log');
const adb = process.env.WATCH_ADB_PATH;
const serial = '127.0.0.1:5591';
const packageName = 'com.codex.maitetsu.rw5';
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const shell = (...args) => execFileSync(adb,['-s',serial,'shell',...args],{encoding:'utf8',windowsHide:true});
const [version, packageFile, limitArgument, alreadyOnTitle] = process.argv.slice(2);
const limit = Number(limitArgument);
const observed = [];
const milestones = new Set(['1:15','1:48','1:96','2:0','3:0','4:0']);
let offset=fs.statSync(log).size, pending='', ended=false, title=false;
function poll(){
 const size=fs.statSync(log).size;
 if(size===offset)return;
 const fd=fs.openSync(log,'r'), bytes=Buffer.alloc(size-offset);
 try{fs.readSync(fd,bytes,0,bytes.length,offset);}finally{fs.closeSync(fd);}
 offset=size;
 const lines=(pending+bytes.toString('utf8')).split('\n');
 pending=lines.pop();
 for(const line of lines){
  assert.doesNotMatch(line,/MAITETSU_RW5 (?:error|background failed)|Assertion failed panic|SIGSEGV|out of memory/i);
  const match=line.match(/MAITETSU_RW5 frame\s+(\d+)\s+(\d+)/);
  if(match)observed.push([Number(match[1]),Number(match[2])]);
  if(line.includes('MAITETSU_RW5 ending'))ended=true;
  if(line.includes('MAITETSU_RW5 title ready'))title=true;
 }
}
async function until(predicate,label,timeout=4000){
 const deadline=performance.now()+timeout;
 while(performance.now()<deadline){
  poll();
  if(predicate())return;
  await sleep(20);
 }
 throw Error('Native event missing: '+label);
}
async function get(route){
 const r=await fetch('http://127.0.0.1:43190'+route);
 if(!r.ok)throw Error(await r.text());
 return r;
}
async function capture(name){
 const file=path.join(root,'docs/images',version+'-reading-'+name+'.png');
 const data=Buffer.from(await (await get('/screen')).arrayBuffer());
 fs.writeFileSync(file,data);
}
async function click(x,y){
 const start=performance.now();
 await get('/click?x='+x+'&y='+y);
 return start;
}
async function main(){
 const manifest=JSON.parse(shell('cat','/data/app/'+packageName+'/manifest.json'));
 assert.equal(manifest.versionName,version);
 if(!alreadyOnTitle){shell('am','start',packageName);await until(()=>title,'title',20000);}
 await sleep(750);
 await click(100,280);
 await until(()=>observed.length===1,'first frame');
 const expected=[354,345,368,470].flatMap((n,i)=>Array.from({length:n},(_,j)=>[i+1,j]));
 const latency=[];
 for(let i=0;i<limit;i++){
  assert.deepEqual(observed[i],expected[i]);
  const [chapter,cursor]=expected[i],key=chapter+':'+cursor;
  if(milestones.has(key)){await sleep(300);await capture(chapter+'-'+cursor);}
  if(i+1===limit&&limit<expected.length)break;
  const start=await click(216,140);
  await until(()=>observed.length>=i+2||ended,'paragraph after '+key);
  latency.push({chapter,cursor,milliseconds:Math.round(performance.now()-start)});
  if((i+1)%250===0)console.log(version,'verified',i+1,'paragraphs');
 }
 assert.equal(observed.length,limit);
 if(limit===expected.length){assert.ok(ended);await sleep(450);await capture('ending');}
 const sha256=createHash('sha256').update(fs.readFileSync(packageFile)).digest('hex');
 const report={passed:true,version,sha256,paragraphs:limit,ending:ended,physicalDeviceTested:false,latency};
 fs.writeFileSync(path.join(root,'reports','native-reading-'+version+'.json'),JSON.stringify(report,null,2));
 console.log(version,'PASS',limit,'paragraphs','ending',ended,sha256);
}
main().catch(error=>{console.error(error);process.exitCode=1;});
