/* Konter Anisa V59 — master akun internal bersumber dari Admin */
(function(){
  'use strict';

  const STORE='ka_admin_accounts_v59';
  const VERSION=1;
  const DEFAULTS=[
    {id:'acct-ilham',name:'Ilham',role:'owner',active:true,source:'admin'},
    {id:'acct-egi',name:'Egi',role:'purchasing',active:true,source:'admin'},
    {id:'acct-sifa',name:'Sifa',role:'employee',active:true,source:'admin'},
    {id:'acct-fitri',name:'Fitri',role:'employee',active:true,source:'admin'},
    {id:'acct-rifda',name:'Rifda',role:'employee',active:true,source:'admin'}
  ];

  const clone=v=>JSON.parse(JSON.stringify(v));
  const cleanName=v=>String(v||'').trim().replace(/\s+/g,' ');
  const validRole=r=>['employee','purchasing','owner','admin'].includes(String(r||''));

  function normalizeAccount(x,index=0){
    const role=String(x?.role||'').toLowerCase();
    const name=cleanName(x?.name);
    if(!name||!validRole(role)) return null;
    return {
      id:String(x?.id||('acct-'+role+'-'+name.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'-'+index)),
      name,
      role,
      active:x?.active!==false,
      source:'admin'
    };
  }

  function readStore(){
    try{
      const raw=JSON.parse(localStorage.getItem(STORE)||'null');
      if(raw && Number(raw.version)===VERSION && Array.isArray(raw.accounts)){
        return raw.accounts.map(normalizeAccount).filter(Boolean);
      }
    }catch(_){}
    return null;
  }

  let accounts=readStore();
  if(!accounts){
    accounts=clone(DEFAULTS);
    persist();
  }

  function persist(){
    localStorage.setItem(STORE,JSON.stringify({version:VERSION,updatedAt:Date.now(),accounts}));
  }

  function notify(){
    try{ window.dispatchEvent(new CustomEvent('ka:admin-accounts-updated',{detail:{accounts:list()}})); }catch(_){}
    try{ if(typeof window.syncDebtDebtorMode==='function') window.syncDebtDebtorMode(); }catch(_){}
  }

  function list(){
    return clone(accounts);
  }

  function activeByRole(role){
    role=String(role||'').toLowerCase();
    return clone(accounts.filter(x=>x.active && x.role===role).sort((a,b)=>a.name.localeCompare(b.name,'id')));
  }

  function replaceFromAdmin(next){
    if(!Array.isArray(next)) throw new Error('Daftar akun Admin harus berupa array.');
    const normalized=next.map(normalizeAccount).filter(Boolean);
    const seen=new Set();
    accounts=normalized.filter(x=>{
      const key=x.id.toLowerCase();
      if(seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    persist();
    notify();
    return list();
  }

  function upsertFromAdmin(account){
    const rec=normalizeAccount(account,accounts.length);
    if(!rec) throw new Error('Nama/role akun tidak valid.');
    const ix=accounts.findIndex(x=>x.id===rec.id);
    if(ix>=0) accounts[ix]=rec;
    else accounts.push(rec);
    persist();
    notify();
    return clone(rec);
  }

  function deactivateFromAdmin(id){
    const rec=accounts.find(x=>x.id===String(id));
    if(!rec) return false;
    rec.active=false;
    persist();
    notify();
    return true;
  }

  function resetDefaults(){
    accounts=clone(DEFAULTS);
    persist();
    notify();
    return list();
  }

  window.KAAdminAccountsV59={
    storeKey:STORE,
    list,
    activeByRole,
    replaceFromAdmin,
    upsertFromAdmin,
    deactivateFromAdmin,
    resetDefaults
  };
  window.KAAdminAccounts=window.KAAdminAccountsV59;

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',notify,{once:true});
  }else{
    notify();
  }
})();