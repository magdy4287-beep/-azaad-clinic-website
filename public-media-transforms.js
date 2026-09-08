/* Public media transform renderer. Default scale=1 preserves the complete uploaded image. */
(()=>{
  const API='/api/public-clinic-data?scope=media-transforms';
  let map=new Map();
  const key=(t,s)=>{try{return `${t}:${new URL(s,location.href).pathname}`}catch{return `${t}:${s}`}};
  const type=i=>i.closest('#doctors,.doctor-card,.team-media')?'doctor':i.closest('#posts,.post-card,.post-media,.feed-media')?'post':'other';
  const apply=()=>document.querySelectorAll('img').forEach(i=>{
    const v=map.get(key(type(i),i.currentSrc||i.src));
    if(!v){i.style.transform='none';return}
    i.style.transformOrigin='center center';
    i.style.transform=`translate(${v.position_x*70}px,${v.position_y*70}px) scale(${v.scale}) rotate(${v.rotation}deg)`;
  });
  async function load(){
    try{
      const r=await fetch(API,{credentials:'same-origin'});
      if(!r.ok)throw Error(await r.text());
      map=new Map((await r.json()).map(x=>[x.media_key,x]));
      apply();
    }catch(e){
      console.warn('Azaad media transforms unavailable; originals remain unmodified.',e);
    }
  }
  window.AZAAD_MEDIA_TRANSFORMS={set:(k,v)=>map.set(k,v),apply,load};
  new MutationObserver(apply).observe(document.documentElement,{childList:true,subtree:true});
  addEventListener('DOMContentLoaded',load);
  addEventListener('load',apply);
})();
