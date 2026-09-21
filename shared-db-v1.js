/* Konter Anisa Shared Database Bridge V1
   Additive persistence layer. Does not change V80/V83/V3 business formulas.
*/
const ENDPOINT='https://nrvmaijxrwaxsoaeogud.supabase.co/functions/v1/ka-sync';
const TOKEN_KEY='ka_sync_pairing_token_v1';
const HASH_KEY='ka_sync_hashes_v1';
const BOOT_KEY='ka_sync_bootstrapped_v1';
const MEDIA_DONE_KEY='ka_sync_media_done_v1';
const SHIFT_INDEX='ka_shift_autosave_v53_index';
const SHIFT_PREFIX='ka_shift_autosave_v53_';
const OIL_PREFIX='ka_oil_purchase_v75_';
const ACC_OBAT_KEY='ka_v41_acc_obat_purchases';
const SEED_NOTES=new Set(['NBJ-0913-01','NBJ-0913-02','NBO-0913-01','NBO-0918-01']);
let started=false,busy=false,timer=null,cloudNoteIds=new Set(),lastError='';

const $=id=>document.getElementById(id);
function read(k,f=null){try{const x=JSON.parse(localStorage.getItem(k)||'null');return x==null?f:x}catch(_){return f}}
function write(k,v){localStorage.setItem(k,JSON.stringify(v));}
function canonical(v){
  if(v===null||typeof v!=='object')return JSON.stringify(v);
  if(Array.isArray(v))return '['+v.map(canonical).join(',')+']';
  return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}';
}
function hash(v){
  const s=canonical(v);let h=2166136261;
  for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}
  return (h>>>0).toString(16);
}
function actor(){
  const s=read('ka_auth_session_v81',null)||read('ka_purchasing_session_v81',null)||{};
  const master=read('ka_admin_accounts_v59',null);
  const list=Array.isArray(master)?master:Array.isArray(master?.accounts)?master.accounts:[];
  const a=list.find(x=>String(x.id||'')===String(s.accountId||''));
  if(a?.name)return a.name;
  const p=location.pathname.toLowerCase();
  return p.includes('admin')?'Admin':p.includes('purchasing')?'Purchasing':'Karyawan';
}
function recKey(r){return r.kind+'::'+r.record_id}
function record(kind,id,payload){return {kind,record_id:String(id),payload,updated_by:actor()}}
function recordsLocal(){
  const out=[];
  const notes=read('ka_v29_purchasing_notes',[]);
  if(Array.isArray(notes)) notes.forEach(n=>{
    if(n?.id&&!SEED_NOTES.has(String(n.id))) out.push(record('note',n.id,n));
  });
  const used=read('ka_v29_used_notes',{});
  if(used&&typeof used==='object')Object.entries(used).forEach(([id,p])=>{
    if(!SEED_NOTES.has(String(id)))out.push(record('note_usage',id,p));
  });

  let idx=read(SHIFT_INDEX,[]);
  if(!Array.isArray(idx))idx=[];
  idx.forEach(x=>{
    const key=String(x?.key||'');
    if(!key.startsWith(SHIFT_PREFIX))return;
    const sid=key.slice(SHIFT_PREFIX.length),payload=read(key,null);
    if(payload&&sid)out.push(record('shift',sid,{...payload,_syncIndexTs:Number(x.ts||payload.savedAt||0)}));
  });

  const accObat=read(ACC_OBAT_KEY,{accessory:[],medicine:[]})||{accessory:[],medicine:[]};
  const purchaseShiftIds=new Set(
    idx.map(x=>String(x?.key||'')).filter(k=>k.startsWith(SHIFT_PREFIX)).map(k=>k.slice(SHIFT_PREFIX.length))
  );
  ['accessory','medicine'].forEach(type=>{
    (Array.isArray(accObat[type])?accObat[type]:[]).forEach(x=>{if(x?.shiftId)purchaseShiftIds.add(String(x.shiftId))});
  });
  purchaseShiftIds.forEach(sid=>{
    if(!sid)return;
    out.push(record('acc_obat_purchase',sid,{
      accessory:(Array.isArray(accObat.accessory)?accObat.accessory:[]).filter(x=>String(x?.shiftId||'')===sid),
      medicine:(Array.isArray(accObat.medicine)?accObat.medicine:[]).filter(x=>String(x?.shiftId||'')===sid)
    }));
  });

  const sums=read('ka_admin_shift_summaries_v1',{});
  if(sums&&typeof sums==='object')Object.entries(sums).forEach(([id,p])=>p&&out.push(record('summary',id,p)));

  const corr=read('ka_admin_correction_requests_v1',[]);
  if(Array.isArray(corr))corr.forEach((x,i)=>{
    const id=String(x?.id||[x?.shiftId,x?.requestedAt,i].filter(Boolean).join('::'));
    if(id)out.push(record('correction',id,x));
  });

  const accounts=read('ka_admin_accounts_v59',null);
  if(accounts)out.push(record('accounts','master',accounts));

  const ex=read('ka_v29_margin_exceptions',null);
  if(ex)out.push(record('margin_exception','master',ex));
  const ap=read('ka_v29_price_approvals',null);
  if(ap)out.push(record('price_approval','master',ap));

  for(let i=0;i<localStorage.length;i++){
    const key=localStorage.key(i)||'';
    if(!key.startsWith(OIL_PREFIX)||key.startsWith(OIL_PREFIX+'legacy_'))continue;
    const id=key.slice(OIL_PREFIX.length),payload=read(key,null);
    if(id&&payload)out.push(record('oil_purchase',id,payload));
  }
  return out;
}
function storageSignal(key,value){
  try{window.dispatchEvent(new StorageEvent('storage',{key,newValue:value==null?null:JSON.stringify(value),storageArea:localStorage,url:location.href}))}catch(_){}
}
function setJson(key,value){
  write(key,value);storageSignal(key,value);
}
function mergeAccObatShift(id,payload){
  const sid=String(id||'');
  let store=read(ACC_OBAT_KEY,{accessory:[],medicine:[]})||{accessory:[],medicine:[]};
  store.accessory=Array.isArray(store.accessory)?store.accessory:[];
  store.medicine=Array.isArray(store.medicine)?store.medicine:[];
  ['accessory','medicine'].forEach(type=>{
    const keep=store[type].filter(x=>String(x?.shiftId||'')!==sid);
    const incoming=Array.isArray(payload?.[type])?payload[type].map(x=>({...x,shiftId:sid})):[];
    store[type]=keep.concat(incoming);
  });
  setJson(ACC_OBAT_KEY,store);
  try{window.KAAccObatV41?.replaceShiftPurchases?.(sid,payload||{accessory:[],medicine:[]})}catch(_){}
}
function applyOne(r){
  if(!r)return;
  const p=r.payload,id=String(r.record_id||'');
  if(r.is_deleted){
    if(r.kind==='acc_obat_purchase'){
      mergeAccObatShift(id,{accessory:[],medicine:[]});
    }
    if(r.kind==='note_usage'){
      const m=read('ka_v29_used_notes',{})||{};
      if(Object.prototype.hasOwnProperty.call(m,id)) delete m[id];
      setJson('ka_v29_used_notes',m);
      try{
        if(window.KARegulationsV29?.usedNotes && typeof window.KARegulationsV29.usedNotes==='object'){
          delete window.KARegulationsV29.usedNotes[id];
        }
        window.KAPurchasingV56?.refreshNotes?.();
      }catch(_){}
    }
    return;
  }
  if(r.kind==='note'){
    let a=read('ka_v29_purchasing_notes',[]);if(!Array.isArray(a))a=[];
    const ix=a.findIndex(x=>String(x?.id||'')===id);
    if(ix>=0)a[ix]=p;else a.push(p);
    setJson('ka_v29_purchasing_notes',a);cloudNoteIds.add(id);
  }else if(r.kind==='note_usage'){
    const m=read('ka_v29_used_notes',{})||{};m[id]=p;setJson('ka_v29_used_notes',m);
    try{
      if(window.KARegulationsV29?.usedNotes && typeof window.KARegulationsV29.usedNotes==='object'){
        window.KARegulationsV29.usedNotes[id]=p;
      }
      window.KAPurchasingV56?.refreshNotes?.();
    }catch(_){}
  }else if(r.kind==='shift'){
    const key=SHIFT_PREFIX+id;setJson(key,p);
    let idx=read(SHIFT_INDEX,[]);if(!Array.isArray(idx))idx=[];
    idx=idx.filter(x=>String(x?.key||'')!==key);
    idx.push({key,ts:Number(p?._syncIndexTs||p?.savedAt||Date.now())});
    idx.sort((a,b)=>Number(b.ts||0)-Number(a.ts||0));
    setJson(SHIFT_INDEX,idx);
  }else if(r.kind==='summary'){
    const m=read('ka_admin_shift_summaries_v1',{})||{};m[id]=p;setJson('ka_admin_shift_summaries_v1',m);
  }else if(r.kind==='correction'){
    let a=read('ka_admin_correction_requests_v1',[]);if(!Array.isArray(a))a=[];
    const ix=a.findIndex(x=>String(x?.id||'')===id);
    if(ix>=0)a[ix]=p;else a.push(p);
    setJson('ka_admin_correction_requests_v1',a);
  }else if(r.kind==='accounts'){
    setJson('ka_admin_accounts_v59',p);
    try{window.dispatchEvent(new CustomEvent('ka:admin-accounts-updated'))}catch(_){}
  }else if(r.kind==='margin_exception'){
    setJson('ka_v29_margin_exceptions',p);
  }else if(r.kind==='price_approval'){
    setJson('ka_v29_price_approvals',p);
  }else if(r.kind==='acc_obat_purchase'){
    mergeAccObatShift(id,p);
  }else if(r.kind==='oil_purchase'){
    setJson(OIL_PREFIX+id,p);
  }
}
async function api(body){
  const token=String(localStorage.getItem(TOKEN_KEY)||'').trim();
  if(!token)throw new Error('not_paired');
  const ctl=new AbortController(),to=setTimeout(()=>ctl.abort(),12000);
  try{
    const res=await fetch(ENDPOINT,{method:'POST',headers:{'content-type':'application/json','x-ka-sync-token':token},body:JSON.stringify(body),signal:ctl.signal,cache:'no-store'});
    const data=await res.json().catch(()=>({ok:false,error:'invalid_response'}));
    if(!res.ok||!data.ok)throw new Error(data.error||('http_'+res.status));
    return data;
  }finally{clearTimeout(to)}
}
function badge(){
  let el=$('kaSharedDbBadge');
  if(el)return el;
  el=document.createElement('span');el.id='kaSharedDbBadge';el.className='status warn';
  el.style.cursor='pointer';el.style.userSelect='none';el.title='Klik untuk pairing / sinkron database bersama';
  const host=document.querySelector('.crumb')||document.querySelector('.topbar')||document.body;
  host.appendChild(el);
  el.onclick=async()=>{
    const existing=!!String(localStorage.getItem(TOKEN_KEY)||'').trim();
    if(existing){
      const change=confirm('Database sudah dipasangkan.\n\nOK = sinkronkan sekarang\nCancel = ganti / putuskan kode pairing');
      if(change){await syncNow(true);return}
    }
    const t=prompt('Masukkan KODE PAIRING Database Konter Anisa.\n\nKode hanya disimpan di perangkat ini. Ketik RESET untuk memutus pairing.','');
    if(t===null)return;
    if(String(t).trim().toUpperCase()==='RESET'){unpair();return}
    if(String(t).trim())await pair(String(t).trim());
  };
  return el;
}
function setStatus(state,detail=''){
  const el=badge();
  if(state==='ok'){el.className='status ok';el.textContent='DATABASE • TERHUBUNG'}
  else if(state==='sync'){el.className='status info';el.textContent='DATABASE • SINKRON...'}
  else if(state==='bad'){el.className='status bad';el.textContent='DATABASE • OFFLINE'}
  else{el.className='status warn';el.textContent='DATABASE • BELUM DIPASANGKAN'}
  el.title=detail||'Klik untuk pairing / sinkron database bersama';
}
function loadHashes(){const h=read(HASH_KEY,{});return h&&typeof h==='object'?h:{}}
function saveHashes(h){write(HASH_KEY,h)}
function baseline(){
  const h={};recordsLocal().forEach(r=>h[recKey(r)]=hash(r.payload));saveHashes(h);
}
async function pullAll(){
  const data=await api({action:'pull'});
  const hashes=loadHashes();
  (data.records||[]).forEach(r=>{
    applyOne(r);
    hashes[recKey(r)]=r.is_deleted?'__deleted__':hash(r.payload);
    if(r.kind==='note'&&!r.is_deleted)cloudNoteIds.add(String(r.record_id));
  });
  saveHashes(hashes);
  try{window.KAPurchasingV56?.refreshNotes?.()}catch(_){}
  try{$('refreshHistory')?.click()}catch(_){}
  try{window.dispatchEvent(new CustomEvent('ka:shared-sync',{detail:{direction:'pull',count:(data.records||[]).length}}))}catch(_){}
  return data.records||[];
}
async function pullUsageTombstones(){
  const data=await api({action:'pull',kinds:['note_usage']});
  const hashes=loadHashes();
  let count=0;
  (data.records||[]).forEach(r=>{
    if(r.kind!=='note_usage'||!r.is_deleted)return;
    applyOne(r);
    hashes[recKey(r)]='__deleted__';
    count++;
  });
  saveHashes(hashes);
  return count;
}
async function pushChanged(){
  const hashes=loadHashes(),local=recordsLocal(),changed=[],localMap=new Map();
  local.forEach(r=>{
    const k=recKey(r),h=hash(r.payload);
    localMap.set(k,r);
    if(hashes[k]!==h)changed.push(r);
  });

  Object.keys(hashes).forEach(k=>{
    if(!k.startsWith('note_usage::'))return;
    if(hashes[k]==='__deleted__'||localMap.has(k))return;
    const id=k.slice('note_usage::'.length);
    if(id)changed.push({kind:'note_usage',record_id:id,payload:{},updated_by:actor(),is_deleted:true});
  });

  if(!changed.length)return 0;
  for(let i=0;i<changed.length;i+=100){
    const batch=changed.slice(i,i+100);
    await api({action:'push',actor:actor(),records:batch});
    batch.forEach(r=>{
      hashes[recKey(r)]=r.is_deleted?'__deleted__':hash(r.payload);
      if(r.kind==='note'&&!r.is_deleted)cloudNoteIds.add(String(r.record_id));
    });
  }
  saveHashes(hashes);
  return changed.length;
}
async function localPhoto(id){
  try{
    return await new Promise((resolve)=>{
      const q=indexedDB.open('ka_purchasing_media_v81',1);
      q.onerror=()=>resolve(null);
      q.onupgradeneeded=()=>{if(!q.result.objectStoreNames.contains('photos'))q.result.createObjectStore('photos',{keyPath:'id'})};
      q.onsuccess=()=>{
        try{
          const g=q.result.transaction('photos','readonly').objectStore('photos').get(id);
          g.onsuccess=()=>resolve(g.result?.dataUrl||null);g.onerror=()=>resolve(null);
        }catch(_){resolve(null)}
      };
    });
  }catch(_){return null}
}
async function uploadPendingMedia(){
  const done=read(MEDIA_DONE_KEY,{})||{},notes=read('ka_v29_purchasing_notes',[]);
  if(!Array.isArray(notes))return 0;
  let n=0;
  for(const note of notes){
    const id=String(note?.id||'');
    if(!id||SEED_NOTES.has(id)||!note?.hasPhoto||done[id]||!cloudNoteIds.has(id))continue;
    const data=await localPhoto(String(note.photoRef||id));
    if(!data)continue;
    try{await api({action:'media_put',note_id:id,data_url:data});done[id]=Date.now();n++}catch(_){}
  }
  write(MEDIA_DONE_KEY,done);return n;
}
async function bootstrap(){
  setStatus('sync');
  await api({action:'health'});
  const remote=await pullAll();
  const was=localStorage.getItem(BOOT_KEY);
  if(!was){
    baseline();
    localStorage.setItem(BOOT_KEY,new Date().toISOString());
    const acc=recordsLocal().filter(r=>r.kind==='accounts');
    if(acc.length){
      await api({action:'push',actor:actor(),records:acc});
      const h=loadHashes();acc.forEach(r=>h[recKey(r)]=hash(r.payload));saveHashes(h);
    }
  }
  await uploadPendingMedia();
  setStatus('ok','Database bersama aktif • '+remote.length+' record cloud terbaca');
}
async function syncNow(manual=false){
  if(busy)return false;
  const token=String(localStorage.getItem(TOKEN_KEY)||'').trim();
  if(!token){setStatus('idle');return false}
  busy=true;setStatus('sync');
  try{
    if(!localStorage.getItem(BOOT_KEY))await bootstrap();
    else{
      const released=await pullUsageTombstones();
      const pushed=await pushChanged();
      const pulled=await pullAll();
      const media=await uploadPendingMedia();
      setStatus('ok','Sinkron selesai • release '+released+' • kirim '+pushed+' • tarik '+pulled.length+' • foto '+media);
    }
    lastError='';return true;
  }catch(e){
    lastError=String(e?.message||e);
    setStatus('bad','Gagal sinkron: '+lastError);
    if(manual)alert('Sinkron database gagal: '+lastError);
    return false;
  }finally{busy=false}
}
async function pair(token){
  localStorage.setItem(TOKEN_KEY,String(token||'').trim());
  localStorage.removeItem(BOOT_KEY);localStorage.removeItem(HASH_KEY);cloudNoteIds=new Set();
  setStatus('sync');
  try{
    await api({action:'health'});
    await bootstrap();
    alert('Database Konter Anisa berhasil dipasangkan di perangkat ini.');
    return true;
  }catch(e){
    localStorage.removeItem(TOKEN_KEY);
    setStatus('bad','Kode pairing tidak valid / server tidak dapat dijangkau');
    alert('Pairing gagal. Periksa kode lalu coba lagi.');
    return false;
  }
}
function unpair(){
  localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(BOOT_KEY);localStorage.removeItem(HASH_KEY);
  cloudNoteIds=new Set();setStatus('idle');
}
async function getMediaUrl(noteId){
  try{const x=await api({action:'media_get',note_id:String(noteId||'')});return x.url||null}catch(_){return null}
}
function start(){
  if(started)return;started=true;badge();
  if(localStorage.getItem(TOKEN_KEY)){syncNow();timer=setInterval(()=>syncNow(false),4000)}
  else setStatus('idle');
  window.addEventListener('online',()=>syncNow(false));
}
export function startKASharedDBV1(){start()}
export const KASharedDBV1={start,pair,unpair,syncNow,getMediaUrl,status:()=>({paired:!!localStorage.getItem(TOKEN_KEY),busy,lastError,endpoint:ENDPOINT})};
window.KASharedDBV1=KASharedDBV1;
