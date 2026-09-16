import fs from 'node:fs';
import ot from 'opentype.js';
const b=fs.readFileSync('assets/source/stratum2bold.ttf');
const font=ot.parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));
// Export original font outlines into missing FFDec dynamic-text definitions.
// Field bounds, sizes and transforms come from the SWF DefineEditText records.
function glyph(id,text,size,minX,width,color,align='center'){
 const advance=font.getAdvanceWidth(text,size),x=minX+(align==='center'?(width-advance)/2:2);
 const path=font.getPath(text,x,font.ascender/font.unitsPerEm*size,size);
 return `<g id="${id}"><path fill="${color}" d="${path.toPathData(5)}"/></g>`;
}
const health=fs.readFileSync('tools/hud-export/health-ready/DefineSprite_31/1.svg','utf8').replace('</defs>',glyph('text0','100',34,58.55,55.05,'#d3e798')+glyph('text1','100',34,61.1,59.7,'#d3e798','left')+'</defs>');
const score=fs.readFileSync('tools/hud-export/timer-ready/DefineSprite_139/1.svg','utf8').replace('</defs>',glyph('text0','0:00',24,40.55,72,'#ffffff')+glyph('text1','0',21,61.5,36.95,'#c1a252')+glyph('text2','0',21,61.75,37.3,'#b1d0df')+'</defs>');
fs.writeFileSync('assets/hud/health.svg',health);fs.writeFileSync('assets/hud/score.svg',score);
