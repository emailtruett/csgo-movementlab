// CKnife::SwingOrStab and FindHullIntersection: line, head hull, then corner rays.
export function knifeTrace(world,start,direction,heavy=false){
 const range=heavy?32:48,end=start.map((v,i)=>v+direction[i]*range);
 let hit=world.traceHull(start,end);
 if(hit.fraction<1)return hit;
 const hull=world.traceHull(start,end,[-16,-16,-18],[16,16,18]);
 if(hull.fraction===1)return null;
 const extended=start.map((v,i)=>v+2*(hull.end[i]-v));
 hit=world.traceHull(start,extended);if(hit.fraction<1)return hit;
 let best=null,distance=Infinity;
 for(const x of [-16,16])for(const y of [-16,16])for(const z of [0,54]){
  const corner=extended.map((v,i)=>v+[x,y,z][i]),tr=world.traceHull(start,corner);
  if(tr.fraction<1){const d=Math.hypot(...tr.end.map((v,i)=>v-start[i]));if(d<distance){best=tr;distance=d;}}
 }return best;
}
