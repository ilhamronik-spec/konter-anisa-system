/* Konter Anisa Purchasing V83 — runtime integrity + workflow lock */
(function(){
  'use strict';

  const BUILD='83';
  const AUTHORITY='purchasing-v83';
  const REQUIRED_IDS=[
    'activeUserName','activeAvatar','autoAccount','autoShift','autoHolder','autoShiftStatus',
    'salesCategories','salesPhoto','salesAmount','saveSalesNote',
    'opCategory','opDetail','opAmount','opPhoto','saveOpNote',
    'historyBody'
  ];
  const REQUIRED_TYPES=['package','cigarette','accessory','medicine','oil'];
  const FORBIDDEN_IDS=['accountSelect','ctxDate','ctxHolder','ctxShift'];

  function localName(src){
    try{
      const u=new URL(src,location.href);
      if(u.origin!==location.origin) return null;
      return u.pathname.split('/').filter(Boolean).pop()||null;
    }catch(_){ return null; }
  }

  function inlineSource(){
    return [...document.scripts]
      .filter(s=>!s.src)
      .map(s=>String(s.textContent||''))
      .join('\n');
  }

  function setBadge(pass,detail){
    const crumb=document.querySelector('.crumb');
    if(!crumb) return;
    let badge=document.getElementById('kaPurchasingLockBadge');
    if(!badge){
      badge=document.createElement('span');
      badge.id='kaPurchasingLockBadge';
      badge.style.marginLeft='8px';
      crumb.appendChild(badge);
    }
    const nextClass='status '+(pass?'ok':'bad');
    const nextText=pass?'PURCHASING V83 • LOCKED':'PURCHASING V83 • LOCK FAILED';
    const nextTitle=detail||'';
    if(badge.className!==nextClass) badge.className=nextClass;
    if(badge.textContent!==nextText) badge.textContent=nextText;
    if(badge.title!==nextTitle) badge.title=nextTitle;
    if(badge.dataset.purchasingLock!=='1') badge.dataset.purchasingLock='1';
  }

  function gate(pass){
    ['saveSalesNote','saveOpNote'].forEach(id=>{
      const el=document.getElementById(id);
      if(!el) return;
      if(!pass){
        el.disabled=true;
        el.dataset.lockDisabled='1';
        el.title='Runtime integrity Purchasing gagal. Penyimpanan diblokir.';
      }else if(el.dataset.lockDisabled==='1'){
        el.disabled=false;
        delete el.dataset.lockDisabled;
        el.removeAttribute('title');
      }
    });
  }

  function audit(){
    const build=document.querySelector('meta[name="ka-build"]')?.content||'';
    const ids=Object.fromEntries(REQUIRED_IDS.map(id=>[id,!!document.getElementById(id)]));
    const missingIds=REQUIRED_IDS.filter(id=>!ids[id]);
    const forbidden=FORBIDDEN_IDS.filter(id=>!!document.getElementById(id));

    const categories=[...document.querySelectorAll('#salesCategories [data-type]')]
      .map(el=>String(el.dataset.type||''));
    const categoriesOk=REQUIRED_TYPES.length===categories.length &&
      REQUIRED_TYPES.every((t,i)=>categories[i]===t);

    const scripts=[...document.querySelectorAll('script[src]')].map(el=>({
      name:localName(el.src),
      build:new URL(el.src,location.href).searchParams.get('build')||''
    })).filter(x=>x.name);
    const accountScripts=scripts.filter(x=>x.name==='account-master-v59.js');
    const lockScripts=scripts.filter(x=>x.name==='purchasing-lock-v83.js');

    const source=inlineSource();
    const tokens={
      personalSession:source.includes("ka_auth_session_v81") && source.includes("currentUser()"),
      activeShift:source.includes("ka_shift_autosave_v53_index") && source.includes("activeShift()"),
      autoAssignment:source.includes("assignedAutomatically:true"),
      notesStore:source.includes("ka_v29_purchasing_notes"),
      usedStore:source.includes("ka_v29_used_notes"),
      opDetailRequired:source.includes("opDetail") && source.includes("Detail barang / keperluan operasional wajib diisi"),
      noManualShift:!source.includes("ctxDate")&&!source.includes("ctxHolder")&&!source.includes("ctxShift")&&!source.includes("accountSelect")
    };
    const tokensOk=Object.values(tokens).every(Boolean);

    const pass=
      build===BUILD &&
      !missingIds.length &&
      !forbidden.length &&
      categoriesOk &&
      accountScripts.length===1 &&
      accountScripts[0].build==='80' &&
      lockScripts.length===1 &&
      lockScripts[0].build===BUILD &&
      tokensOk;

    const result={
      build:BUILD,authority:AUTHORITY,pass,missingIds,forbidden,categories,categoriesOk,
      scripts,tokens
    };

    document.documentElement.dataset.kaPurchasingBuild=BUILD;
    document.documentElement.dataset.kaPurchasingAuthority=AUTHORITY;
    document.documentElement.dataset.kaPurchasingLock=pass?'PASS':'FAIL';
    window.KA_PURCHASING_BUILD=BUILD;
    gate(pass);
    setBadge(pass,JSON.stringify(result));

    if(pass) console.info('KONTER ANISA PURCHASING V83 WORKFLOW LOCKED',result);
    else console.error('KONTER ANISA PURCHASING V83 LOCK FAIL',result);
    return result;
  }

  window.KAPurchasingLockV83=Object.freeze({
    build:BUILD,
    authority:AUTHORITY,
    requiredIds:Object.freeze(REQUIRED_IDS.slice()),
    requiredTypes:Object.freeze(REQUIRED_TYPES.slice()),
    audit
  });

  let timer=null;
  function scheduleAudit(){
    clearTimeout(timer);
    timer=setTimeout(audit,80);
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(audit,0),{once:true});
  }else{
    setTimeout(audit,0);
  }
  window.addEventListener('load',()=>setTimeout(audit,150),{once:true});
  window.addEventListener('pageshow',()=>setTimeout(audit,0));

  const observer=new MutationObserver(mutations=>{
    if(mutations.some(m=>{
      const t=m.target;
      if(!(t instanceof Element)) return false;
      if(t.id==='kaPurchasingLockBadge' || t.closest?.('#kaPurchasingLockBadge')) return false;
      return t.id==='salesCategories' ||
        REQUIRED_IDS.includes(t.id) ||
        FORBIDDEN_IDS.includes(t.id) ||
        !!t.closest?.('#salesCategories');
    })) scheduleAudit();
  });
  const start=()=>{ if(document.body) observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['id','data-type']}); };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();