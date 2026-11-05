// Adapted from the stable-row reader in the user's Steins;Gate 0 MIT port.
import {widths} from './text-widths.js';
export function wrapText(text,width,size){
 const limit=width/size,lines=[],opening='（〔［｛〈《「『【＜“‘([{',closing='、。，．：；？！）」』】＞”’)]},.!?;:%';
 const measure=s=>Array.from(s).reduce((n,c)=>n+(widths[c]===undefined?1:widths[c]),0);
 for(const paragraph of String(text||'').split('\n')){
  let line='',used=0;
  for(const ch of paragraph){const unit=widths[ch]===undefined?1:widths[ch];
   if(line&&used+unit>limit){let cut=line.length;while(cut>0&&opening.indexOf(line.charAt(cut-1))>=0)cut--;if(closing.indexOf(ch)>=0){while(cut>0&&closing.indexOf(line.charAt(cut-1))>=0)cut--;if(cut>0)cut--;}if(cut<=0)cut=line.length;lines.push(line.slice(0,cut).trim());line=line.slice(cut);used=measure(line);}
   if(!line&&ch===' ')continue;line+=ch;used+=unit;
  }lines.push(line.trim());
 }return lines.join('\n');
}
export function planTextRows(text,generation){const rows=[],ranges=[];let offset=0;for(const value of text.split('\n')){rows.push({id:'text:'+generation+':'+rows.length,text:''});ranges.push({start:offset,text:value});offset+=value.length+1;}return {rows,ranges};}
export function revealTextRows(rows,ranges,length){let changed=0;for(let i=0;i<ranges.length;i++){const r=ranges[i],value=r.text.slice(0,Math.max(0,length-r.start));if(rows[i].text!==value){rows[i].text=value;changed++;}}return changed;}
export function nextGlyphEnd(text,index){let end=index;while(end<text.length&&text.charAt(end)==='\n')end++;if(end<text.length){const code=text.charCodeAt(end++);if(code>=0xd800&&code<=0xdbff&&end<text.length){const low=text.charCodeAt(end);if(low>=0xdc00&&low<=0xdfff)end++;}}return end;}
