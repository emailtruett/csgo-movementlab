import {box,ramp,World} from './physics.mjs';
export function createMap(){
  const brushes=[];
  const block=(min,max,tag='concrete')=>brushes.push(box(min,max,tag));
  block([-1000,-900,-48],[1000,900,0],'floor');
  block([-1032,-932,0],[1032,-900,224],'wall');
  block([-1032,900,0],[1032,932,224],'wall');
  block([-1032,-900,0],[-1000,900,224],'wall');
  block([1000,-900,0],[1032,900,224],'wall');
  // Staircase: sixteen-unit risers are below Source's 18-unit step limit.
  for(let i=0;i<8;i++)block([-830,50+i*40,0],[-590,90+i*40,(i+1)*16],'step');
  block([-830,370,0],[-390,610,128],'platform');
  brushes.push(ramp([-390,410,0],[122,610,128],true));
  // Jump boxes: 48-unit regular jump, 64-unit crouch jump, then gaps.
  block([250,-310,0],[394,-166,48],'jump');
  block([535,-310,0],[679,-166,64],'jump');
  block([770,-310,0],[914,-166,96],'jump');
  // 60-unit clearance: standing hull 72, crouched hull 54.
  block([-820,-510,0],[-792,-210,112],'concrete');
  block([-568,-510,0],[-540,-210,112],'concrete');
  block([-820,-510,60],[-540,-210,112],'ceiling');
  // Wall contact and counter-strafe lane, open on both ends.
  block([450,90,0],[478,640,128],'wall');
  block([800,90,0],[828,640,128],'wall');
  return new World(brushes);
}
