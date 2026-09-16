(function(){
 function failure(error){
  document.getElementById('play').textContent='Nie udało się uruchomić gry';
  document.getElementById('error').textContent=error.message||String(error);
 }
 window.movementStartupError=failure;
 window.addEventListener('error',event=>{if(event.error)failure(event.error);});
 window.addEventListener('unhandledrejection',event=>failure(event.reason||'Błąd ładowania gry'));
 function script(src){return new Promise((resolve,reject)=>{const tag=document.createElement('script');tag.src=src;tag.onload=resolve;tag.onerror=()=>reject(Error('Brakuje pliku '+src+'. Zachowaj index.html razem z całym folderem gry.'));document.body.append(tag);});}
 if(location.protocol==='file:'||new URLSearchParams(location.search).has('offline')){
  script('offline/assets.js').then(()=>script('offline/game.js')).catch(failure);
 }else import('./main.mjs').catch(failure);
})();
