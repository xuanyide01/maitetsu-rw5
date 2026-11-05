const test=require('node:test'),assert=require('node:assert/strict'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),read=p=>fs.readFileSync(path.join(root,p),'utf8');
function moduleOf(file,names,context={}){const src=read(file).replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');return vm.runInNewContext('(function(){'+src+';return {'+names.join(',')+'};})()',context);}
const catalog=moduleOf('src/common/catalog.js',['CHAPTERS','COUNTS','CHUNK_SIZE']);
const engine=moduleOf('src/common/engine.js',['newState','checkpoint','restore','readFrame','next','previous','nextChapter','readChapterSkip','choose'],catalog);
const formatting=moduleOf('src/common/text-format.js',['normalizeText']);
const saves=moduleOf('src/common/saves.js',['SLOT_COUNT','LEGACY_KEY','slotKey','decodeSave','createSave','slotRow'],{...engine,...formatting});
function rows(s){return JSON.parse(read('src/common/story/'+s.chapter+'-'+Math.floor(s.cursor/catalog.CHUNK_SIZE)+'.txt'));}
function frame(s){return engine.readFrame(s.cursor>=catalog.COUNTS[s.chapter-1]?[]:rows(s),s);}
function clock(){let now=1000,next=1;const timers=new Map();return {setTimeout(fn,ms){const id=next++;timers.set(id,{at:now+ms,fn});return id;},clearTimeout(id){timers.delete(id);},get now(){return now;},run(ms){const end=now+ms;let count=0;while(true){const item=[...timers].filter(([,v])=>v.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];if(!item)break;assert.ok(++count<100000,'timer storm');const [id,t]=item;timers.delete(id);now=t.at;t.fn();}now=end;}};}
function page(holdStory=false){
 const time=clock(),settings=new Map(),events=[],reads=[],storyReads=[],pending=[],quiet={log(){},error(){}};let playing=false,src='';
 const audio={stop(){events.push('stop');playing=false;if(audio.onstop)audio.onstop();},play(){events.push('play');playing=true;if(audio.onplay)audio.onplay();}};
 Object.defineProperty(audio,'src',{get(){throw Error('Native src getter must not be polled');},set(value){src=value;events.push('src');if(audio.onloadeddata)audio.onloadeddata();}});
 class TestDate extends Date{static now(){return time.now;}}
 const ctx={console:quiet,setTimeout:time.setTimeout,clearTimeout:time.clearTimeout,Date:TestDate};
 const music=moduleOf('src/common/title-music.js',['makeTitleMusic'],ctx);
 const text=formatting;const auto=moduleOf('src/common/auto-reader.js',['autoSpeeds','autoWait']);const gallery=moduleOf('src/common/gallery.js',['groupGallery','stepVariant']);
 const widths=moduleOf('src/common/text-widths.js',['widths']);const reveal=moduleOf('src/common/text-reveal.js',['wrapText','planTextRows','revealTextRows','nextGlyphEnd'],widths);
 const file={readText(o){
  if(o.uri.includes('/story/')){storyReads.push({uri:o.uri,blocking:p.loading});if(holdStory){pending.push(o);return;}}
  o.success({text:read('src'+o.uri)});
 }},storage={get(o){reads.push(o.key);o.success(settings.get(o.key)||o.default||'');},set(o){settings.set(o.key,o.value);if(o.success)o.success();}};
 const script=read('src/pages/index/index.ux').match(/<script>([\s\S]*?)<\/script>/)[1].replace(/^import .*;\r?\n/gm,'').replace('export default','module.exports=');
 const sandbox={...ctx,...engine,...saves,...catalog,...music,...text,...auto,...gallery,...reveal,imagePath:x=>x,file,storage,audio,prompt:{showToast(){}},module:{exports:{}}};
 vm.runInNewContext(script,sandbox);const definition=sandbox.module.exports,p=Object.assign({},definition,definition.private,{$app:{$def:{}},$element(){return {scrollTo(){}};}});
 function complete(error=false){const item=pending.shift();assert.ok(item);if(error)item.fail(null,404);else item.success({text:read('src'+item.uri)});}
 p.onInit();return {p,time,settings,events,reads,storyReads,complete,audio,get playing(){return playing;}};
}
test('all 1537 Chinese paragraphs appear once, in the original four-chapter order',()=>{
 const expected=JSON.parse(read('converted/text.json')),s=engine.newState();let i=0;
 while(true){const f=frame(s);if(f.type==='end')break;if(f.type==='jump'){[s.chapter,s.cursor]=f.to;continue;}assert.equal(f.speaker,expected[i][0]);assert.equal(f.text,expected[i][1]);assert.ok(s.layers.length<=4);engine.next(s);i++;}
 assert.equal(i,1537);assert.equal(s.chapter,4);assert.equal(s.ended,true);assert.ok(s.history.length<=30);
});
test('history and restore cross a text-chunk boundary without repeating or losing text',()=>{
 const s=engine.newState();for(let i=0;i<49;i++){frame(s);engine.next(s);}const f=frame(s);assert.equal(s.cursor,49);const saved=saves.createSave(s,'play',1);engine.next(s);assert.equal(engine.previous(s),true);assert.equal(frame(s).text,f.text);assert.equal(frame(saves.decodeSave(JSON.stringify(saved)).state).text,f.text);
});
test('chapter skip reaches each exact next chapter and can be undone',()=>{
 const s=engine.newState();frame(s);for(let c=2;c<=4;c++){const previous=engine.checkpoint(s);engine.nextChapter(s);assert.equal(s.chapter,c);assert.equal(s.cursor,0);assert.equal(frame(s).type,'text');assert.equal(engine.previous(s),true);assert.equal(s.chapter,previous.chapter);engine.nextChapter(s);frame(s);}assert.equal(engine.nextChapter(s),null);
});
test('30 independent save slots, safe rejection of malformed positions',()=>{
 assert.equal(saves.SLOT_COUNT,30);const keys=new Set(Array.from({length:30},(_,i)=>saves.slotKey(i)));assert.equal(keys.size,30);for(const key of keys)assert.match(key,/^maitetsu_rw5_slot_v1_/);
 for(const saved of [{chapter:0,cursor:0},{chapter:5,cursor:0},{chapter:1,cursor:354},{chapter:1,cursor:-1},{chapter:1,cursor:0.1}])assert.throws(()=>engine.restore(saved));assert.throws(()=>saves.slotKey(30));
});
test('art taps complete typing first, advance on the next tap, ignore a drag',()=>{
 const h=page(),p=h.p;p.startNew();assert.equal(p.session.cursor,0);p.dialogueTap();assert.equal(p.displayText,p.fullText);assert.equal(p.session.cursor,0);p.dialogueTap();assert.equal(p.session.cursor,1);
 p.dialogueTouchStart({touches:[{clientX:100,clientY:100}]});p.dialogueTouchMove({touches:[{clientX:110,clientY:160}]});p.dialogueTouchEnd();p.dialogueTap();assert.equal(p.session.cursor,1);p.onDestroy();
});
test('automatic reading pauses in menus and background and resumes with a fresh delay',()=>{
 const h=page(),p=h.p;p.textSpeed=0;p.startNew();p.showMenu();p.toggleAuto();h.time.run(20000);assert.equal(p.session.cursor,0);p.resume();h.time.run(1500);assert.equal(p.session.cursor,1);p.onHide();const cursor=p.session.cursor;h.time.run(30000);assert.equal(p.session.cursor,cursor);p.onShow();h.time.run(100);assert.equal(p.session.cursor,cursor);p.onDestroy();
});
test('30-slot UI writes and restores slot 30 independently',()=>{
 const h=page(),p=h.p;p.textSpeed=0;p.startNew();p.dialogueTap();p.showMenu();p.saveGame();assert.equal(p.loading,true);h.time.run(0);p.slotPage=7;p.loadSlotPage();h.time.run(0);p.selectSlot(29);assert.ok(h.settings.has(saves.slotKey(29)));const cursor=p.session.cursor;p.toTitle();p.continueGame();h.time.run(0);p.slotPage=7;p.loadSlotPage();p.selectSlot(29);assert.equal(p.session.cursor,cursor);assert.equal(p.mode,'play');p.onDestroy();
});

test('slot loading bounds native callback bursts and cancels after leaving the page',()=>{
 const h=page(),p=h.p;h.reads.length=0;p.continueGame();assert.equal(h.reads.length,1);assert.equal(p.loading,true);p.closeSlots();h.time.run(0);assert.equal(h.reads.length,1);assert.equal(p.mode,'title');p.continueGame();h.time.run(0);assert.equal(p.loading,false);assert.equal(p.slotRows.length,4);assert.equal(h.reads.length,5);p.closeSlots();p.continueGame();h.time.run(0);assert.equal(h.reads.length,5);p.slotPage=7;p.loadSlotPage();h.time.run(0);assert.equal(h.reads.length,7);assert.equal(p.slotRows.length,2);p.onDestroy();
});
test('one owned title player survives gallery, CG and load navigation and releases for reading/background',()=>{
 const h=page(),p=h.p;assert.equal(h.events.filter(x=>x==='play').length,1);p.openGallery();p.viewCg(0);p.cycleCg();p.backToGallery();p.toTitle();p.continueGame();p.closeSlots();assert.equal(h.events.filter(x=>x==='play').length,1);assert.equal(h.playing,true);p.startNew();assert.equal(h.playing,false);p.toTitle();assert.equal(h.playing,true);p.onHide();assert.equal(h.playing,false);p.onDestroy();
});
test('guarded music loop stops before EOF, recreates once and never restarts after page destruction',()=>{
 const h=page();h.time.run(281880);assert.equal(h.playing,false);h.time.run(1200);assert.equal(h.events.filter(x=>x==='play').length,2);h.p.onDestroy();h.time.run(600000);assert.equal(h.events.filter(x=>x==='play').length,2);
});
test('title audio watchdog releases a failed load and external pause cancels replay',()=>{
 const time=clock(),events=[],audio={play(){events.push('play');},stop(){events.push('stop');}};const m=moduleOf('src/common/title-music.js',['makeTitleMusic'],{console:{log(){},error(){}},setTimeout:time.setTimeout,clearTimeout:time.clearTimeout});const c=m.makeTitleMusic(audio);c.update(true);time.run(10000);assert.deepEqual(events,['play','stop']);time.run(600000);assert.equal(events.length,2);c.destroy();const fresh=m.makeTitleMusic(audio);fresh.update(true);audio.onpause();time.run(600000);assert.deepEqual(events,['play','stop','play','stop']);fresh.destroy();
});

test('original plain Chinese text is used for all 1537 paragraphs, including 39 rich-text records',()=>{
 const expected=JSON.parse(read('converted/text.json'));let i=0,rich=0;
 for(const chapter of JSON.parse(read('tests/fixtures/original-text-reference.json'))){
  for(const [speaker,cn] of chapter){if(cn.length>4)rich++;const plain=(cn.length>4?cn[4]:cn[1]).replace(/\u3000/g,' ').trim();assert.equal(expected[i][0],cn[0]||speaker||'');assert.equal(expected[i++][1],plain);assert.doesNotMatch(plain,/\\x|%l|#[0-9a-f]{8};/i);}
 }assert.equal(i,1537);assert.equal(rich,39);
 assert.equal(formatting.normalizeText('她是\\x%lクハ26;#00ffc040;Ｋｕｈａ２６%l;#;的专用铁路人偶。'),'她是Kuha26的专用铁路人偶。');
});

test('old save previews strip control codes before truncating the text',()=>{
 const row=saves.slotRow(0,{state:{chapter:1,text:'她是\\x%lクハ26;#00ffc040;Ｋｕｈａ２６%l;#;的专用铁路人偶，是最先进的列车组件。'}});
 assert.match(row.preview,/她是Kuha26的专用铁路人偶/);assert.doesNotMatch(row.preview,/\\x|%l|ffc040/);
});

test('text switches with its intended layers without waiting for image callbacks',()=>{
 const h=page(),p=h.p;p.textSpeed=0;p.startNew();assert.equal(p.loading,false);
 const old=p.actors.map(a=>a.key);p.session.cursor=15;p.renderFrame();
 assert.equal(p.loading,false);assert.match(p.fullText.replace(/\n/g,''),/她是Kuha26的专用铁路人偶/);
 assert.deepEqual(p.actors.map(a=>a.src),p.session.layers.map(a=>a.image));
 const stale=old.find(key=>!p.actors.some(a=>a.key===key));assert.ok(stale);
 p.sceneLayerFailed(stale);assert.equal(p.mode,'play');
 p.sceneLayerFailed(p.actors[0].key);assert.equal(p.mode,'error');p.onDestroy();
});

test('typewriter updates fixed rows without rebuilding images or row identities',()=>{
 const h=page(),p=h.p;p.session=engine.newState();p.session.cursor=15;p.renderFrame();const images=p.actors,rows=p.dialogueRows,ids=rows.map(x=>x.id);h.time.run(120);assert.equal(p.actors,images);assert.equal(p.dialogueRows,rows);assert.deepEqual(rows.map(x=>x.id),ids);assert.ok(p.displayText.length>1);assert.ok(rows.some(x=>x.text.length));p.onDestroy();
});

test('backgrounding during a block read ignores stale callbacks and resumes the same paragraph',()=>{
 const h=page(true),p=h.p;p.textSpeed=0;p.startNew();p.onHide();h.complete();h.time.run(1000);
 assert.equal(p.mode,'title');assert.equal(p._pendingFrame,true);assert.equal(p.storyLoadingNotice,false);
 p.onShow();h.complete();assert.equal(p.loading,false);assert.equal(p.session.cursor,0);assert.equal(p.displayText,p.fullText);p.onDestroy();
});

test('all subsequent story blocks are read ahead once during uninterrupted reading',()=>{
 const h=page(),p=h.p;p.textSpeed=0;p.startNew();
 for(let i=0;i<1537;i++){assert.equal(p.mode,'play');assert.equal(p.loading,false);p.advance();}
 assert.equal(p.mode,'end');assert.equal(h.storyReads.length,34);
 assert.equal(new Set(h.storyReads.map(r=>r.uri)).size,34);
 assert.equal(h.storyReads.filter(r=>r.blocking).length,1);p.onDestroy();
});

test('a slow prefetch is shared at the boundary and retries without clearing the old paragraph',()=>{
 const h=page(true),p=h.p;p.textSpeed=0;p.startNew();h.complete();
 for(let i=0;i<47;i++)p.advance();
 assert.equal(h.storyReads.length,2);assert.equal(h.storyReads[1].blocking,false);
 const old=p.dialogueRows;p.advance();assert.equal(p.loading,true);assert.equal(p.dialogueRows,old);
 assert.equal(h.storyReads.length,2);h.time.run(349);assert.equal(p.storyLoadingNotice,false);
 h.time.run(1);assert.equal(p.storyLoadingNotice,true);
 h.complete(true);assert.equal(h.storyReads.length,3);h.complete();assert.equal(p.loading,false);
 assert.equal(p.storyLoadingNotice,false);assert.equal(p.session.cursor,48);assert.notEqual(p.dialogueRows,old);p.onDestroy();
});

test('changing font in the menu reflows the current paragraph without changing the scene or position',()=>{
 const h=page(),p=h.p;p.textSpeed=0;p.session.cursor=15;p.renderFrame();const scene=p.actors,cursor=p.session.cursor,text=p.fullText.replace(/\n/g,'');p.showMenu();p.toggleFont();assert.equal(p.fontSize,28);assert.equal(p.actors,scene);assert.equal(p.session.cursor,cursor);assert.equal(p.displayText,p.fullText);assert.equal(p.fullText.replace(/\n/g,''),text);p.resume();assert.equal(p.mode,'play');p.onDestroy();
});
