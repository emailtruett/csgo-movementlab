// Source coordinates: X/Y horizontal, Z up; one unit equals one Source unit.
// Formula references and known differences are recorded in README.md.
export const CFG=Object.freeze({dt:1/64,gravity:800,accelerate:5.5,airaccelerate:12,
  friction:5.2,stopspeed:80,maxspeed:260,jump:301.993377,step:18,aircap:30});
const EPS=0.03125;
const dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0);
const add=(a,b,s=1)=>a.map((v,i)=>v+b[i]*s);
const mul=(a,s)=>a.map(v=>v*s);
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const clip=(v,n)=>{let out=add(v,n,-dot(v,n));const adjust=dot(out,n);if(adjust<0)out=add(out,n,-adjust);return out.map(x=>Math.abs(x)<1e-8?0:x);};
export function box(min,max,tag='') {
  return {min,max,tag,planes:[[[1,0,0],max[0]],[[-1,0,0],-min[0]],[[0,1,0],max[1]],[[0,-1,0],-min[1]],[[0,0,1],max[2]],[[0,0,-1],-min[2]]]};
}
export function ramp(min,max,descending=false) {
  const b=box(min,max,'ramp'),slope=(descending?-1:1)*(max[2]-min[2])/(max[0]-min[0]),len=Math.hypot(slope,1);
  b.planes[4]=[[-slope/len,0,1/len],((descending?max[2]:min[2])-slope*min[0])/len];return b;
}
export class World {
  constructor(brushes=[]){this.brushes=brushes;}
  trace(start,end,height=72) {
    return this.traceHull(start,end,[-16,-16,0],[16,16,height]);
  }
  traceHull(start,end,mins=[0,0,0],maxs=[0,0,0]) {
    let fraction=1,normal=[0,0,0],solid=false,brush=null;
    for(const b of this.brushes){
      if([0,1,2].some(i=>Math.min(start[i],end[i])+mins[i]>b.max[i]+EPS || Math.max(start[i],end[i])+maxs[i]<b.min[i]-EPS))continue;
      let enter=-1,leave=1,hit=null,out=false,endsOut=false,reject=false;
      for(const [n,d] of b.planes){
        const expanded=d-n.reduce((sum,v,i)=>sum+v*(v<0?maxs[i]:mins[i]),0);
        const a=dot(start,n)-expanded,z=dot(end,n)-expanded;
        if(a>0)out=true;if(z>0)endsOut=true;
        if(a>0&&z>=a){reject=true;break;}
        if(a<=0&&z<=0)continue;
        if(a>z){const f=(a-EPS)/(a-z);if(f>enter){enter=f;hit=n;}}
        else leave=Math.min(leave,(a+EPS)/(a-z));
      }
      if(reject)continue;
      if(!out){if(!endsOut)solid=true;continue;}
      if(enter<leave&&enter>-1&&enter<fraction){fraction=Math.max(0,enter);normal=hit;brush=b;}
    }
    return {fraction,normal,solid,brush,end:add(start,add(end,start,-1),fraction)};
  }
}
export class Player {
  constructor(world,options={}){this.world=world;this.maxSpeed=options.maxSpeed??CFG.maxspeed;this.reset();}
  reset(pos=[0,-540,0.03125]){this.pos=[...pos];this.vel=[0,0,0];this.grounded=false;this.duck=0;this.crouched=false;this.duckSpeed=8;this.lastDuck=-1;this.time=0;this.oldDuck=false;this.oldJump=false;this.stamina=0;this.fallSpeed=0;this.jumps=0;this.lastCrouchPos=[...pos];this.surfaceFriction=1;this.categorize();}
  get height(){return this.crouched?54:72;}
  get eye(){const t=this.duck*this.duck*(3-2*this.duck);return 64-18*t;}
  get speed(){return Math.hypot(this.vel[0],this.vel[1]);}
  trace(a,b,h=this.height){return this.world.trace(a,b,h);}
  categorize(distance=2){
    this.surfaceFriction=1;
    if(this.vel[2]>140){this.grounded=false;return;}
    const t=this.trace(this.pos,add(this.pos,[0,0,-distance]));
    this.grounded=!t.solid&&t.fraction<1&&t.normal[2]>=0.7;
    if(this.grounded){this.pos=t.end;this.vel[2]=0;}
    else if(this.vel[2]>0)this.surfaceFriction=0.25;
  }
  duckMove(raw,dt){
    if(raw!==this.oldDuck)this.duckSpeed=Math.max(0,this.duckSpeed-2);
    this.oldDuck=raw;
    const held=raw&&this.duckSpeed>=1.5&&(this.crouched||this.time>=this.lastDuck+0.4);
    this.duckSpeed=Math.min(8,this.duckSpeed+dt*3);
    if(this.duckSpeed===8)this.lastCrouchPos=[...this.pos];
    else if((this.duck===0||this.duck===1)&&Math.hypot(this.pos[0]-this.lastCrouchPos[0],this.pos[1]-this.lastCrouchPos[1])>64)this.duckSpeed=Math.min(8,this.duckSpeed+dt*6);
    if(held&&this.duck<1){
      this.duck=Math.min(1,this.duck+dt*this.duckSpeed*0.8);
      if(!this.grounded||this.duck===1){
        if(!this.crouched&&!this.grounded)this.pos[2]+=9;
        this.duck=1;this.crouched=true;this.lastDuck=this.time;
      }
    }else if(!held&&this.duck>0){
      const target=add(this.pos,[0,0,!this.grounded&&this.crouched?-9:0]);
      const room=this.world.trace(target,target,72);
      if(!room.solid){
        this.duck=Math.max(0,this.duck-dt*Math.max(1.5,this.duckSpeed));
        if(!this.grounded||this.duck===0){this.pos=target;this.duck=0;this.crouched=false;}
        else if(this.duck<=0.75)this.crouched=false;
      }else{this.duck=1;this.crouched=true;}
    }
    return held;
  }
  slide(pos,velocity,dt){
    let p=[...pos],v=[...velocity],original=[...v],time=dt,planes=[];
    for(let bump=0;bump<4;bump++){
      if(Math.hypot(...v)===0)break;
      const tr=this.trace(p,add(p,v,time));
      if(tr.solid){v=[0,0,0];break;}
      if(tr.fraction>0){p=tr.end;original=[...v];planes=[];}
      if(tr.fraction===1)break;
      time*=1-tr.fraction;planes.push(tr.normal);
      let candidate=null;
      for(const n of planes){const c=clip(original,n);if(planes.every(other=>dot(c,other)>=-1e-7)){candidate=c;break;}}
      if(candidate)v=candidate;
      else if(planes.length===2){let dir=cross(planes[0],planes[1]);const len=Math.hypot(...dir);dir=mul(dir,1/(len||1));v=mul(dir,dot(dir,v));}
      else{v=[0,0,0];break;}
      if(dot(v,velocity)<=0){v=[0,0,0];break;}
    }
    return {pos:p,vel:v};
  }
  move(dt){
    const start=[...this.pos],vel=[...this.vel],flat=this.slide(start,vel,dt);
    if(!this.grounded){Object.assign(this,flat);return;}
    const up=this.trace(start,add(start,[0,0,CFG.step+EPS]));
    const raised=this.slide(up.end,vel,dt);
    const down=this.trace(raised.pos,add(raised.pos,[0,0,-CFG.step-EPS]));
    const distance=p=>(p[0]-start[0])**2+(p[1]-start[1])**2;
    if(!down.solid&&down.fraction<1&&down.normal[2]>=0.7&&distance(raised.pos)>distance(flat.pos)){
      this.pos=down.end;this.vel=[raised.vel[0],raised.vel[1],flat.vel[2]];
    }else Object.assign(this,flat);
    // StayOnGround: step down without bouncing on stair edges.
    const a=this.trace(this.pos,add(this.pos,[0,0,2]));
    const b=this.trace(a.end,add(this.pos,[0,0,-CFG.step]));
    if(!b.solid&&b.fraction<1&&b.normal[2]>=0.7)this.pos=b.end;
  }
  tick(input={},yaw=0,dt=CFG.dt){
    this.time+=dt;
    // CheckParameters precedes ReduceTimers in Source.
    let max=this.maxSpeed;
    const ducking=input.duck||this.duck>0;
    const walking=input.walk&&!ducking;
    if(walking&&Math.hypot(...this.vel)<max*0.52+25)max*=0.52;
    max*=Math.max(0,1-this.stamina/100)**2;
    this.stamina=Math.max(0,this.stamina-60*dt);
    this.duckMove(!!input.duck,dt);
    max*=1-0.66*this.duck;
    let f=(input.forward?1:0)-(input.back?1:0),s=(input.right?1:0)-(input.left?1:0);
    const len=Math.hypot(f,s);if(len){f/=len;s/=len;}
    const wish=[Math.cos(yaw)*f+Math.sin(yaw)*s,Math.sin(yaw)*f-Math.cos(yaw)*s,0];
    this.vel[2]-=CFG.gravity*dt/2;
    if(this.grounded)this.vel[2]=0;
    if(input.jump&&!this.oldJump&&this.grounded){
      if(this.speed>this.maxSpeed*1.1)this.vel=mul(this.vel,this.maxSpeed*1.1/this.speed);
      this.grounded=false;
      this.vel[2]=CFG.jump*Math.max(0,1-this.stamina/100)-CFG.gravity*dt/2;
      this.stamina=Math.min(80,this.stamina+0.08*this.vel[2]);this.jumps++;
    }
    this.oldJump=!!input.jump;
    const wasGround=this.grounded;
    if(wasGround){
      const speed=this.speed;
      if(speed>=0.1){const next=Math.max(0,speed-Math.max(speed,CFG.stopspeed)*CFG.friction*this.surfaceFriction*dt);this.vel[0]*=next/speed;this.vel[1]*=next/speed;}
      this.vel[2]=0;
    }
    if(len){
      const current=dot(this.vel,wish),cap=wasGround?max:Math.min(max,CFG.aircap),remaining=cap-current;
      let amount;
      if(wasGround){
        let scale=Math.max(250,max),accel=CFG.accelerate;
        if(ducking)scale*=0.34;else if(walking){scale*=0.52;if(current>scale-5)accel*=Math.max(0,1-(current-(scale-5))/5);}
        amount=accel*scale*dt*this.surfaceFriction;
      }else amount=CFG.airaccelerate*max*dt*this.surfaceFriction;
      if(remaining>0)this.vel=add(this.vel,wish,Math.min(remaining,amount));
    }
    if(wasGround&&this.speed>max){const ratio=max/this.speed;this.vel[0]*=ratio;this.vel[1]*=ratio;}
    this.fallSpeed=Math.max(this.fallSpeed,-this.vel[2]);
    this.move(dt);this.categorize();
    this.vel[2]-=CFG.gravity*dt/2;
    if(this.grounded){this.vel[2]=0;if(!wasGround)this.stamina=Math.min(80,this.stamina+0.05*this.fallSpeed);this.fallSpeed=0;}
    this.vel=this.vel.map(v=>Math.max(-3500,Math.min(3500,Math.fround(v))));
    if(this.pos[2]<-1500)this.reset();
  }
}
