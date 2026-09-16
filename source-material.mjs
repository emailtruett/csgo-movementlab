import * as THREE from 'three';

const triple=(value,fallback)=>{const values=String(value??'').match(/-?\d*\.?\d+/g)?.map(Number);return values?.length===3?values:fallback;};

// Port the material controls used by these VMTs from phong_ps20b.fxc.
// Scene lighting still comes from the browser renderer, not Source light probes.
export async function sourceMaterial(def,loader,root){
 const p=def.params;
 const [map,normalMap,exponent]=await Promise.all(['$basetexture','$bumpmap','$phongexponenttexture'].map(key=>def.textures[key]?loader.loadAsync(root+def.textures[key]):null));
 if(map){map.colorSpace=THREE.SRGBColorSpace;map.anisotropy=8;}
 const material=new THREE.MeshPhongMaterial({map,normalMap,normalScale:new THREE.Vector2(1,-1),shininess:Number(p.$phongexponent)||32,side:THREE.DoubleSide});
 const uniforms={
  sourceExponent:{value:exponent},sourceBoost:{value:Number(p.$phongboost??1)},
  sourceAlbedoBoost:{value:Number(p.$phongalbedoboost??1)},
  sourceTint:{value:new THREE.Vector3(...triple(p.$phongtint,[-1,-1,-1]))},
  sourceFresnel:{value:new THREE.Vector3(...triple(p.$phongfresnelranges,[0,.5,1]))}
 };
 material.customProgramCacheKey=()=>JSON.stringify([!!exponent,!!normalMap,p.$basemapalphaphongmask,p.$phongexponent]);
 material.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.fragmentShader=`uniform sampler2D sourceExponent;
uniform float sourceBoost;
uniform float sourceAlbedoBoost;
uniform vec3 sourceTint;
uniform vec3 sourceFresnel;
`+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_phong_fragment>',`#include <lights_phong_fragment>
vec4 sourceExp = ${exponent?'texture2D(sourceExponent, vMapUv)':'vec4(0.0)'};
${exponent&&!Number(p.$phongexponent)?'material.specularShininess = 1.0 + 149.0 * sourceExp.r;':''}
float sourceMask = ${p.$basemapalphaphongmask==='1'?'diffuseColor.a':normalMap?'texture2D(normalMap, vNormalMapUv).a':'1.0'};
float sourceFacing = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
float sourceF = sourceFacing * sourceFacing;
float sourceReflection = sourceF > 0.5 ? mix(sourceFresnel.y, sourceFresnel.z, 2.0*sourceF-1.0) : mix(sourceFresnel.x, sourceFresnel.y, 2.0*sourceF);
material.specularColor = sourceTint.x < 0.0 ? mix(vec3(sourceBoost), sourceAlbedoBoost * diffuseColor.rgb, sourceExp.g) : sourceBoost * sourceTint;
material.specularStrength = sourceMask * sourceReflection;
`);
  // Source uses the unnormalized Blinn lobe without the additional N.L term.
  const lighting=THREE.ShaderChunk.lights_phong_pars_fragment.replace('reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;',
   'float sourceNDotH = saturate(dot(geometryNormal, normalize(directLight.direction + geometryViewDir)));\nreflectedLight.directSpecular += directLight.color * pow(sourceNDotH, material.specularShininess) * material.specularColor * material.specularStrength;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_phong_pars_fragment>',lighting);
 };
 return material;
}
