/* Konter Anisa Auth Client V1 — Supabase Auth + role gate */
(function(){
  'use strict';
  const SUPABASE_URL='https://nrvmaijxrwaxsoaeogud.supabase.co';
  const PUBLISHABLE_KEY='sb_publishable_tiznMT7yXPvE-h5WfQ2FYA_0Sbqpx0Y';
  const AUTH_ADMIN=SUPABASE_URL+'/functions/v1/ka-auth-admin';
  const LEGACY_AUTH_STORAGE_KEY='ka_supabase_auth_tab_v1';
  const AUTH_STORAGE_PTR='ka_supabase_auth_active_key_v2';
  let sdkPromise=null,clientPromise=null;

  function newTabAuthStorageKey(){
    const suffix=(globalThis.crypto?.randomUUID?.()||(
      Date.now().toString(36)+'-'+Math.random().toString(36).slice(2)
    )).replace(/[^a-zA-Z0-9_-]/g,'');
    const next='ka_supabase_auth_tab_v2_'+suffix;
    try{
      const previous=String(sessionStorage.getItem(AUTH_STORAGE_PTR)||LEGACY_AUTH_STORAGE_KEY);
      const sources=[previous,LEGACY_AUTH_STORAGE_KEY].filter((v,i,a)=>v&&a.indexOf(v)===i);
      sources.forEach(src=>{
        const keys=[];
        for(let i=0;i<sessionStorage.length;i++){
          const k=sessionStorage.key(i);
          if(k&&(k===src||k.startsWith(src+'-')))keys.push(k);
        }
        keys.forEach(k=>{
          const v=sessionStorage.getItem(k);
          if(v!==null){
            const dest=next+k.slice(src.length);
            if(sessionStorage.getItem(dest)===null)sessionStorage.setItem(dest,v);
          }
        });
      });
      sessionStorage.setItem(AUTH_STORAGE_PTR,next);
      // Hapus key auth lama dari tab INI setelah migrasi. Tab lain memiliki
      // sessionStorage terpisah dan tidak ikut terpengaruh.
      for(const src of sources){
        if(src===next)continue;
        const keys=[];
        for(let i=0;i<sessionStorage.length;i++){
          const k=sessionStorage.key(i);
          if(k&&(k===src||k.startsWith(src+'-')))keys.push(k);
        }
        keys.forEach(k=>sessionStorage.removeItem(k));
      }
    }catch(_){}
    return next;
  }
  const AUTH_STORAGE_KEY=newTabAuthStorageKey();

  function qs(v){return encodeURIComponent(String(v||''))}
  function nextUrl(){return location.pathname.split('/').pop()+(location.search||'')+(location.hash||'')}
  function loginUrl(reason=''){
    const u=new URL('./login.html',location.href);
    u.searchParams.set('next',nextUrl());
    if(reason)u.searchParams.set('reason',reason);
    return u.href;
  }
  function reveal(){
    document.documentElement.classList.remove('ka-auth-pending');
    document.documentElement.dataset.kaAuthReady='1';
  }
  function localSmokeBypass(){
    const host=String(location.hostname||'');
    return (host==='127.0.0.1'||host==='localhost') && new URLSearchParams(location.search).get('ci_smoke')==='1';
  }
  async function sdk(){
    if(window.supabase?.createClient)return window.supabase;
    if(!sdkPromise)sdkPromise=import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
    return sdkPromise;
  }
  async function client(){
    if(!clientPromise)clientPromise=(async()=>{
      const lib=await sdk();
      return lib.createClient(SUPABASE_URL,PUBLISHABLE_KEY,{
        auth:{
          persistSession:true,
          autoRefreshToken:true,
          detectSessionInUrl:true,
          storage:window.sessionStorage,
          // Unik per page/tab instance. Ini memutus BroadcastChannel Supabase
          // antar akun berbeda (mis. Ilham di Admin dan Sifa di Karyawan).
          storageKey:AUTH_STORAGE_KEY
        }
      });
    })();
    return clientPromise;
  }
  async function callAdmin(body,headers={}){
    const res=await fetch(AUTH_ADMIN,{
      method:'POST',
      headers:{'content-type':'application/json',...headers},
      body:JSON.stringify(body),
      cache:'no-store'
    });
    const data=await res.json().catch(()=>({ok:false,error:'invalid_response'}));
    if(!res.ok||!data.ok)throw new Error(data.error||('http_'+res.status));
    return data;
  }
  async function status(){
    try{return await callAdmin({action:'status'})}
    catch(e){return {ok:false,configured:null,error:String(e?.message||e)}}
  }
  function cleanUsername(v){
    return String(v||'').trim().toLowerCase().replace(/\s+/g,'');
  }
  function emailFor(username){return cleanUsername(username)+'@konter-anisa.local'}
  async function signIn(username,password){
    try{sessionStorage.removeItem('ka_runtime_shift_context_v1')}catch(_){}
    const c=await client();
    const {data,error}=await c.auth.signInWithPassword({email:emailFor(username),password:String(password||'')});
    if(error)throw error;
    return data;
  }
  async function signOut(){
    try{sessionStorage.removeItem('ka_runtime_shift_context_v1')}catch(_){}
    try{const c=await client();await c.auth.signOut({scope:'local'})}catch(_){}
    location.replace('./login.html');
  }
  async function session(){
    const c=await client();
    const {data}=await c.auth.getSession();
    return data?.session||null;
  }
  async function ownProfile(){
    const c=await client();
    const s=await session();
    if(!s)return null;
    const {data,error}=await c.from('ka_profiles')
      .select('id,username,display_name,role,active,must_change_password')
      .eq('id',s.user.id).maybeSingle();
    if(error)throw error;
    return data||null;
  }
  function injectLogout(profile){
    if(document.getElementById('kaLogoutBtn'))return;
    const host=document.querySelector('.topbar .user')||document.querySelector('.topbar')||document.body;
    const b=document.createElement('button');
    b.id='kaLogoutBtn';b.type='button';b.className='btn';
    b.style.marginLeft='8px';b.textContent='Keluar';
    b.title='Keluar dari akun '+String(profile?.display_name||profile?.username||'');
    b.onclick=signOut;
    host.appendChild(b);
  }
  async function requireRole(allowed){
    allowed=Array.isArray(allowed)?allowed:[allowed];
    if(localSmokeBypass()){reveal();return {bypass:true}}
    const st=await status();
    if(st.configured===false){
      // Transisi aman: sebelum Owner pertama dibuat, workflow lama tidak dikunci.
      reveal();
      document.documentElement.dataset.kaAuthMode='bootstrap';
      return {bootstrap:true};
    }
    if(st.configured!==true){
      document.documentElement.dataset.kaAuthMode='offline';
      location.replace(loginUrl('auth_backend_unavailable'));
      return null;
    }
    const s=await session();
    if(!s){location.replace(loginUrl('login_required'));return null}
    let p=null;
    try{p=await ownProfile()}catch(_){}
    if(!p||!p.active){await signOut();return null}
    if(!allowed.includes(String(p.role)) && !allowed.includes('*')){
      const target=homeForRole(String(p.role||''));
      const here='./'+(location.pathname.split('/').pop()||'index.html');
      if(target!==here)location.replace(target);
      else location.replace('./login.html?reason=role_denied');
      return null;
    }
    window.KA_AUTH_PROFILE=p;
    document.documentElement.dataset.kaAuthMode='authenticated';
    document.documentElement.dataset.kaAuthRole=String(p.role);
    injectLogout(p);reveal();

    // Auth watcher hanya untuk perubahan sesi di tab INI. Setiap tab memakai
    // storageKey/BroadcastChannel unik sehingga akun berbeda tidak saling me-redirect.
    if(!window.__KA_AUTH_WATCH_BOUND){
      window.__KA_AUTH_WATCH_BOUND=true;
      const c=await client();
      c.auth.onAuthStateChange((event,newSession)=>{
        if(event==='SIGNED_OUT'||!newSession){
          window.KA_AUTH_PROFILE=null;
          document.documentElement.dataset.kaAuthMode='signed_out';
          const page=location.pathname.split('/').pop()||'';
          if(page!=='login.html')setTimeout(()=>location.replace(loginUrl('session_expired')),0);
          return;
        }
        const currentId=String(window.KA_AUTH_PROFILE?.id||'');
        const newId=String(newSession?.user?.id||'');
        if(currentId&&newId&&currentId!==newId){
          setTimeout(async()=>{
            try{
              const np=await ownProfile();
              const page=location.pathname.split('/').pop()||'';
              const target=np?homeForRole(np.role):'./login.html';
              if(page!=='login.html')location.replace(target);
            }catch(_){location.replace('./login.html?reason=session_changed')}
          },0);
        }
      });
    }

    try{window.dispatchEvent(new CustomEvent('ka:auth-ready',{detail:p}))}catch(_){}
    return p;
  }
  async function bootstrapOwner(username,password,displayName){
    const token=String(localStorage.getItem('ka_sync_pairing_token_v1')||'').trim();
    if(!token)throw new Error('database_pairing_required');
    return callAdmin({
      action:'bootstrap',username:cleanUsername(username),password:String(password||''),display_name:String(displayName||'').trim()
    },{'x-ka-sync-token':token});
  }
  async function adminCall(action,payload={}){
    const s=await session();
    if(!s?.access_token)throw new Error('login_required');
    return callAdmin({action,...payload},{authorization:'Bearer '+s.access_token});
  }
  function homeForRole(role){
    if(role==='owner'||role==='admin')return './admin.html';
    if(role==='purchasing')return './purchasing.html';
    return './index.html';
  }
  window.KAAuthV1={
    client,status,signIn,signOut,session,ownProfile,requireRole,bootstrapOwner,adminCall,homeForRole,
    loginUrl,emailFor,projectUrl:SUPABASE_URL
  };
})();