import * as THREE from 'three';
import {DecalGeometry} from './node_modules/three/examples/jsm/geometries/DecalGeometry.js';
export class KnifeDecals {
 constructor(scene){this.scene=scene;this.items=[];this.materials=[];const loader=new THREE.TextureLoader();for(const suffix of ['','2','3']){const map=loader.load('./assets/source/decals_manhackcut'+suffix+'.png');map.colorSpace=THREE.NoColorSpace;this.materials.push(new THREE.ShaderMaterial({uniforms:{map:{value:map}},vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform sampler2D map;varying vec2 vUv;void main(){gl_FragColor=texture2D(map,vUv);}',transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-4,blending:THREE.CustomBlending,blendSrc:THREE.DstColorFactor,blendDst:THREE.SrcColorFactor,blendEquation:THREE.AddEquation}));}}
 add(hit,yaw){const target=hit.brush?.mesh;if(!target)return;
  target.updateMatrixWorld(true);const normal=new THREE.Vector3(...hit.normal),right=new THREE.Vector3(Math.sin(yaw),-Math.cos(yaw),0);right.addScaledVector(normal,-right.dot(normal));if(right.lengthSq()<.001)right.set(1,0,0).cross(normal);right.normalize();const up=new THREE.Vector3().crossVectors(normal,right).normalize();const rotation=new THREE.Euler().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right,up,normal));
  // Original VMT $decalscale 0.10, source texture 128x128.
  const position=new THREE.Vector3(...hit.end).addScaledVector(normal,-.03125);
  const material=this.materials[Math.floor(Math.random()*this.materials.length)];const geometry=new DecalGeometry(target,position,rotation,new THREE.Vector3(12.8,12.8,4));const decal=new THREE.Mesh(geometry,material);decal.renderOrder=2;this.scene.add(decal);this.items.push(decal);
  if(this.items.length>128){const first=this.items.shift();this.scene.remove(first);first.geometry.dispose();}
 }
}
