/* Konter Anisa ↔ SDMsmart Integration Client V1
 * Safe foundation: mapping + read-only schedule gateway.
 * No direct Firebase write. No SDMsmart production mutation.
 */
(function(){
  'use strict';
  const ENDPOINT='https://nrvmaijxrwaxsoaeogud.supabase.co/functions/v1/ka-sdm-gateway';

  async function call(action,payload={}){
    if(!window.KAAuthV1?.session)throw new Error('auth_client_unavailable');
    const session=await window.KAAuthV1.session();
    if(!session?.access_token)throw new Error('login_required');
    const res=await fetch(ENDPOINT,{
      method:'POST',
      headers:{
        'content-type':'application/json',
        'authorization':'Bearer '+session.access_token
      },
      body:JSON.stringify({action,...payload}),
      cache:'no-store'
    });
    const data=await res.json().catch(()=>({ok:false,error:'invalid_response'}));
    if(!res.ok||!data.ok)throw new Error(data.error||('http_'+res.status));
    return data;
  }

  function todayJakarta(){
    return new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'});
  }

  function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  async function renderEmployeeGateShadow(){
    const content=document.querySelector('.content');
    if(!content||!window.KA_AUTH_PROFILE||!['employee','admin','owner'].includes(String(window.KA_AUTH_PROFILE.role||'')))return;
    let box=document.getElementById('kaSdmGateShadow');
    if(!box){
      box=document.createElement('div');
      box.id='kaSdmGateShadow';
      box.className='card';
      box.style.marginBottom='14px';
      box.style.padding='15px';
      const hero=content.querySelector('.hero');
      if(hero?.nextSibling)content.insertBefore(box,hero.nextSibling);else content.prepend(box);
    }
    box.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>Gate SDMsmart</b><div style="font-size:11px;color:var(--muted);margin-top:4px">Memeriksa mapping & jadwal read-only…</div></div><span class="status info">SHADOW • TIDAK MEMBLOKIR</span></div>';
    try{
      const r=await call('my_schedule',{date:todayJakarta()});
      const m=r.mapping,sc=r.schedule,g=r.gate||{};
      let detail='',tone='info',title='BELUM TERHUBUNG';
      if(!m){
        title='MAPPING BELUM ADA';tone='warn';
        detail='Akun Konter ini belum dipasangkan ke users.id SDMsmart.';
      }else if(!sc){
        title='JADWAL BELUM TERBACA';tone='warn';
        detail='Mapping sudah ada, tetapi jadwal tanggal ini belum masuk cache read-only.';
      }else{
        const time=[String(sc.start_time||'').slice(0,5),String(sc.end_time||'').slice(0,5)].filter(Boolean).join('–');
        title=(g.allowed?'TERJADWAL':'TIDAK ADA SHIFT KERJA');
        tone=g.allowed?'ok':'warn';
        detail=String(sc.code||'')+' • '+String(sc.label||'')+(time?' • '+time:'')+' • '+String(sc.sdm_display_name||m.sdm_display_name||'');
      }
      box.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>Gate SDMsmart • '+esc(title)+'</b><div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(detail)+'</div></div><span class="status '+tone+'">'+(g.enforced?'ENFORCED':'SHADOW • TIDAK MEMBLOKIR')+'</span></div>';
    }catch(e){
      box.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>Gate SDMsmart • GATEWAY BELUM SIAP</b><div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(String(e?.message||e))+'</div></div><span class="status warn">SHADOW • TIDAK MEMBLOKIR</span></div>';
    }
  }

  window.KASDMV1={
    call,
    status:()=>call('status'),
    mySchedule:(date=todayJakarta())=>call('my_schedule',{date}),
    listMappings:()=>call('list_mappings'),
    saveMapping:(payload)=>call('save_mapping',payload),
    listSchedules:(from,to)=>call('list_schedules',{from,to}),
    syncSchedules:(from,to)=>call('sync_schedules',{from,to}),
    renderEmployeeGateShadow,
    todayJakarta,
    endpoint:ENDPOINT
  };
})();