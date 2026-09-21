/* Konter Anisa BUILD 80 — runtime integrity + workflow lock */
(function(){
  'use strict';

  const BUILD='80';
  const EXPECTED=[
    'account-master-v59.js',
    'rules-v29.js',
    'layout-v31.js',
    'transactions-v33.js',
    'transactions-v34.js',
    'transactions-v37.js',
    'transactions-v38.js',
    'transactions-v39.js',
    'transactions-v40.js',
    'transactions-v41.js',
    'transactions-v42.js',
    'transactions-v43.js',
    'transactions-v50.js',
    'transactions-v51.js',
    'transactions-v53.js',
    'transactions-v55.js',
    'transactions-v61.js',
    'ui-clean-v74.js',
    'transactions-v75.js',
    'transactions-v79.js',
    'runtime-lock-v77.js'
  ];

  function localName(src){
    try{
      const u=new URL(src,location.href);
      if(u.origin!==location.origin) return null;
      return u.pathname.split('/').filter(Boolean).pop()||null;
    }catch(_){ return null; }
  }

  function collect(){
    return [...document.querySelectorAll('script[src]')].map(el=>{
      const u=new URL(el.src,location.href);
      return {el,name:localName(el.src),build:u.searchParams.get('build')||'',src:el.getAttribute('src')||''};
    }).filter(x=>x.name);
  }

  function setBadge(pass,detail=''){
    const crumb=document.querySelector('.crumb');
    if(!crumb) return;
    let badge=document.getElementById('kaBuildLockBadge');
    if(!badge){
      badge=document.createElement('span');
      badge.id='kaBuildLockBadge';
      badge.style.marginLeft='8px';
      crumb.appendChild(badge);
    }
    badge.className='status '+(pass?'ok':'bad');
    badge.textContent=pass?'BUILD V80 • WORKFLOW LOCKED':'BUILD V80 • LOCK FAILED';
    badge.title=detail;
    badge.dataset.runtimeLock='1';
  }

  function audit(strictGlobals=true){
    const scripts=collect();
    const names=scripts.map(x=>x.name);
    const counts=names.reduce((m,n)=>(m[n]=(m[n]||0)+1,m),{});
    const missing=EXPECTED.filter(n=>!counts[n]);
    const duplicates=Object.entries(counts).filter(([,n])=>n>1).map(([name,count])=>({name,count}));
    const unexpected=names.filter(n=>!EXPECTED.includes(n));
    const wrongBuild=scripts.filter(x=>EXPECTED.includes(x.name)&&x.build!==BUILD).map(x=>({name:x.name,build:x.build,src:x.src}));
    const orderOk=EXPECTED.every((name,i)=>names.indexOf(name)===i);
    const globals={
      regulations:!!window.KARegulationsV29,
      accounts:!!window.KAAdminAccounts,
      balance:!!window.KABalanceV44,
      stock:!!window.KAStockV50,
      autosave:!!window.KAAutosaveV53,
      features:!!window.KAFeaturesV61,
      oilPurchase:!!window.KAOilPurchaseV76,
      workflow:!!window.KAFeaturesV61?.workflowOk?.() && document.documentElement.dataset.kaWorkflowAuthority==='v61'
    };
    const globalsOk=!strictGlobals||Object.values(globals).every(Boolean);
    const pass=!missing.length&&!duplicates.length&&!unexpected.length&&!wrongBuild.length&&orderOk&&globalsOk;

    const result={build:BUILD,pass,missing,duplicates,unexpected,wrongBuild,orderOk,globals,names:[...names]};
    document.documentElement.dataset.kaBuild=BUILD;
    document.documentElement.dataset.kaRuntimeLock=pass?'PASS':'FAIL';
    window.KA_RUNTIME_BUILD=BUILD;
    setBadge(pass,JSON.stringify(result));
    if(!pass) console.error('KONTER ANISA RUNTIME LOCK FAIL',result);
    else console.info('KONTER ANISA BUILD V80 WORKFLOW LOCKED',result);
    return result;
  }

  // Old modules may try to rewrite the version badge after delayed refreshes.
  // Keep the authoritative build badge visible and immutable from those text updates.
  function enforceBadge(){
    const current=document.getElementById('kaBuildLockBadge');
    if(current && current.dataset.runtimeLock==='1') return;
    const state=document.documentElement.dataset.kaRuntimeLock;
    setBadge(state!=='FAIL');
  }

  window.KARuntimeLockV77=Object.freeze({
    build:BUILD,
    expected:Object.freeze(EXPECTED.slice()),
    audit
  });

  audit(false);
  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',()=>setTimeout(()=>audit(true),1400),{once:true});
  }else{
    setTimeout(()=>audit(true),1400);
  }
  window.addEventListener('load',()=>setTimeout(()=>audit(true),1700),{once:true});

  const observer=new MutationObserver(()=>enforceBadge());
  const startObserver=()=>{
    if(document.body) observer.observe(document.body,{childList:true,subtree:true,characterData:true});
  };
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',startObserver,{once:true});
  else startObserver();
})();