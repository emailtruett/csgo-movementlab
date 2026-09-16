import * as THREE from 'three';

export function assetURL(url){
 const key=String(url).replace(/^\.\//,'');
 return globalThis.MOVEMENT_OFFLINE?.files[key]??url;
}
THREE.DefaultLoadingManager.setURLModifier(assetURL);

export async function loadKarambitData(url){
 if(globalThis.MOVEMENT_OFFLINE)return globalThis.MOVEMENT_OFFLINE.karambit;
 const response=await fetch(url);
 if(!response.ok)throw Error('Nie można wczytać karambita ('+response.status+')');
 return response.json();
}
