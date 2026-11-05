import {COUNTS,CHUNK_SIZE} from './catalog.js';
export function newState(){return {chapter:1,cursor:0,sceneId:'',layers:[],speaker:'',text:'',choices:[],history:[],ended:false};}
export function checkpoint(s){return {chapter:s.chapter,cursor:s.cursor,speaker:s.speaker,text:s.text,ended:s.ended};}
export function restore(saved){
 if(!saved||!Number.isInteger(saved.chapter)||saved.chapter<1||saved.chapter>4||!Number.isInteger(saved.cursor)||saved.cursor<0||saved.cursor>=COUNTS[saved.chapter-1])throw Error('存档位置无效');
 return Object.assign(newState(),checkpoint(saved),{history:[]});
}
export function readFrame(rows,s){
 if(s.cursor>=COUNTS[s.chapter-1]){if(s.chapter===4){s.ended=true;return {type:'end'};}return {type:'jump',to:[s.chapter+1,0]};}
 if(!rows||rows.v!==2||!Array.isArray(rows.lines)||!Array.isArray(rows.scenes))throw Error('剧情数据无效');
 const f=rows.lines[s.cursor%CHUNK_SIZE];if(!Array.isArray(f)||f.length!==3||typeof f[1]!=='string')throw Error('剧情分段位置无效');
 const scene=rows.scenes[f[2]];if(!scene||!Array.isArray(scene.layers)||scene.layers.length>4)throw Error('场景索引无效');
 s.speaker=f[0];s.text=f[1];s.sceneId=scene.id;s.layers=scene.layers;
 return {type:'text',speaker:s.speaker,text:s.text};
}
function remember(s){s.history.push({chapter:s.chapter,cursor:s.cursor,ended:s.ended});if(s.history.length>30)s.history.shift();}
export function next(s){remember(s);s.cursor++;}
export function previous(s){const h=s.history.pop();if(!h)return false;const history=s.history;Object.assign(s,h,{history});return true;}
export function nextChapter(s){if(s.chapter>=4)return null;remember(s);const chapter=s.chapter;s.chapter++;s.cursor=0;s.ended=false;return {chapter};}
export function readChapterSkip(rows,s){return readFrame(rows,s);}
export function choose(){throw Error('二六原始四章没有分支选项');}
