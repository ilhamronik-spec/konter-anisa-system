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
  function slug(v){return String(v||'unknown').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'')||'unknown'}
  function dateLabelId(date){
    try{return new Date(String(date)+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})}
    catch(_){return String(date||'')}
  }
  function timeLabel(ts){
    if(!ts)return '';
    try{return new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(ts)).replace('.',':')+' WIB'}
    catch(_){return ''}
  }
  function runtimeContext(profile,sc){
    const holder=String(profile?.display_name||profile?.username||sc?.sdm_display_name||'Karyawan').trim();
    const shift=String(sc?.label||sc?.code||'Shift').trim();
    const date=String(sc?.date||todayJakarta());
    const dateLabel=dateLabelId(date);
    return {
      id:date+'-'+slug(shift)+'-'+slug(holder),
      date,dateLabel,shift,holder,
      label:dateLabel+' • Shift '+shift+' • '+holder,
      shiftCode:String(sc?.code||''),
      startTime:String(sc?.start_time||''),
      endTime:String(sc?.end_time||''),
      sourceScheduleId:String(sc?.source_schedule_id||''),
      profileId:String(profile?.id||''),
      source:'sdmsmart'
    };
  }
  function contextMatches(ctx){
    const a=window.KARegulationsV29?.activeShift||window.KA_SHIFT_CONTEXT||{};
    return String(a.date||'')===String(ctx.date||'') &&
      String(a.holder||'')===String(ctx.holder||'') &&
      String(a.shift||'')===String(ctx.shift||'');
  }
  function ensureRuntimeContext(profile,sc){
    if(!profile||String(profile.role||'')!=='employee'||!sc)return false;
    const q=new URLSearchParams(location.search);
    if(q.get('sim_date'))return false;
    const ctx=runtimeContext(profile,sc);
    const loadedFromRuntime=String(document.documentElement.dataset.kaRuntimeShiftReady||'')==='1';
    const wasCorrect=contextMatches(ctx);
    try{sessionStorage.setItem('ka_runtime_shift_context_v1',JSON.stringify(ctx))}catch(_){}

    // First authenticated resolve: reload once so Rules + Autosave initialize
    // against the correct employee/date/shift key, never the old preview shift.
    if(!loadedFromRuntime && !wasCorrect){
      const u=new URL(location.href);
      u.searchParams.set('ctx','sdm');
      location.replace(u.href);
      return true;
    }

    window.KA_SHIFT_CONTEXT=ctx;
    if(window.KARegulationsV29?.activeShift){
      const a=window.KARegulationsV29.activeShift;
      a.id=ctx.id;a.date=ctx.date;a.shift=ctx.shift;a.holder=ctx.holder;a.label=ctx.label;
    }
    return false;
  }
  function updateEmployeeShell(r){
    const p=r?.profile||window.KA_AUTH_PROFILE||{},sc=r?.schedule||null,g=r?.gate||{},session=r?.session||null;
    if(!sc)return;
    const holder=String(p.display_name||p.username||sc.sdm_display_name||'Karyawan');
    const shift=String(sc.label||sc.code||'Shift');
    const dateLabel=dateLabelId(sc.date);
    const start=String(sc.start_time||'').slice(0,5),end=String(sc.end_time||'').slice(0,5);
    const byId=id=>document.getElementById(id);
    if(byId('shiftCrumbText'))byId('shiftCrumbText').textContent='Perhitungan Harian / '+dateLabel;
    if(byId('topbarRoleShift'))byId('topbarRoleShift').textContent='Karyawan • '+shift;
    if(byId('holderPill'))byId('holderPill').textContent='Pemegang: '+holder;
    if(byId('scheduleLabel'))byId('scheduleLabel').textContent=shift;
    if(byId('scheduleTime'))byId('scheduleTime').textContent=(start&&end)?start+'–'+end:'—';

    const work=byId('workStatusPill');
    if(work){
      work.textContent=g.allowed?'● Dalam Jam Kerja':'● '+(gateReasonLabel[g.reason]||'Menunggu');
      work.className='pill '+(g.allowed?'green':'blue');
    }
    const status=byId('shiftStatusLabel'),sub=byId('shiftStatusSub');
    if(session?.status==='handover_complete'){
      if(status)status.textContent='Selesai';
      if(sub)sub.textContent='Handover '+(timeLabel(session.handover_at)||'selesai');
    }else if(session?.status==='in_progress'){
      if(status)status.textContent='Sedang Berjalan';
      if(sub)sub.textContent='Dibuka '+(timeLabel(session.opened_at)||'');
    }else if(g.allowed){
      if(status)status.textContent='Siap Dimulai';
      if(sub)sub.textContent='Belum ada session hitungan';
    }else{
      if(status)status.textContent='Menunggu';
      if(sub)sub.textContent=gateReasonLabel[g.reason]||String(g.reason||'Gate belum siap');
    }
  }
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
      const m=r.mapping,sc=r.schedule,g=r.gate||{},session=r.session||null,prev=r.previous_schedule||null,pos=r.queue_position||null,total=r.queue_length||null;
      if(sc&&ensureRuntimeContext(r.profile||window.KA_AUTH_PROFILE,sc))return;
      document.documentElement.dataset.kaRuntimeShiftReady='1';
      updateEmployeeShell(r);
      let detail='',tone='info',title='BELUM TERHUBUNG';
      if(!m){
        title='MAPPING BELUM ADA';tone='warn';
        detail='Akun Konter ini belum dipasangkan ke users.id SDMsmart.';
      }else if(!sc){
        title='JADWAL BELUM TERBACA';tone='warn';
        detail='Mapping sudah ada, tetapi jadwal tanggal ini belum masuk cache read-only.';
      }else{
        const time=[String(sc.start_time||'').slice(0,5),String(sc.end_time||'').slice(0,5)].filter(Boolean).join('–');
        title=g.allowed?(session?.status==='in_progress'?'SHIFT BERJALAN':session?.status==='handover_complete'?'HANDOVER SELESAI':'TERJADWAL'):'TERKUNCI';
        tone=g.allowed?'ok':'warn';
        detail=String(sc.code||'')+' • '+String(sc.label||'')+(time?' • '+time:'')+' • '+String(sc.sdm_display_name||m.sdm_display_name||'')+' • '+(gateReasonLabel[g.reason]||g.reason||'');
        if(pos)detail+=' • Urutan hitung '+pos+(total?' dari '+total:'');
        if(prev&&g.reason==='previous_not_handover')detail+=' • Menunggu '+String(prev.sdm_display_name||prev.sdm_user_id||'shift sebelumnya');
      }
      box.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>Gate SDMsmart • '+esc(title)+'</b><div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(detail)+'</div></div><span class="status '+tone+'">'+(g.enforced?'ENFORCED':'SHADOW • TIDAK MEMBLOKIR')+'</span></div>';
    }catch(e){
      box.innerHTML='<div style="display:flex;gap:12px;justify-content:space-between;align-items:center;flex-wrap:wrap"><div><b>Gate SDMsmart • GATEWAY BELUM SIAP</b><div style="font-size:11px;color:var(--muted);margin-top:4px">'+esc(String(e?.message||e))+'</div></div><span class="status warn">SHADOW • TIDAK MEMBLOKIR</span></div>';
    }
  }

  const gateReasonLabel={
    employee_not_mapped:'Akun belum dipetakan ke SDMsmart',
    no_schedule:'Tidak ada jadwal SDMsmart untuk hari ini',
    not_working:'Jadwal OFF/Cuti',
    before_shift:'Belum masuk jam shift',
    after_shift:'Jam shift sudah berakhir',
    future_schedule:'Jadwal belum aktif',
    past_schedule:'Jadwal sudah lewat',
    previous_not_handover:'Menunggu pemegang hitungan sebelumnya menyelesaikan handover',
    purchasing_excluded:'Purchasing tidak masuk antrean pemegang hitungan',
    not_calculation_holder:'Bukan pemegang hitungan pada antrean hari ini',
    same_start_conflict:'Ada lebih dari satu karyawan mulai pada jam yang sama — perlu prioritas Admin',
    ready:'Siap memulai hitungan',
    in_progress:'Shift sedang berjalan',
    submitted:'Hitungan sudah dikirim',
    handover_complete:'Handover selesai'
  };
  function bindShiftSessionShadow(){
    const btn=document.getElementById('openingNextBtn');
    if(!btn||btn.dataset.kaSdmSessionBound==='1')return;
    btn.dataset.kaSdmSessionBound='1';
    btn.addEventListener('click',async()=>{
      try{
        const r=await call('begin_shift',{date:todayJakarta()});
        if(r?.session)renderEmployeeGateShadow();
      }catch(_){
        // Mode SHADOW tidak boleh mengganggu perhitungan produksi.
      }
    });
  }
  function bootEmployeeShadow(){
    let tries=0;
    const t=setInterval(()=>{
      tries++;
      bindShiftSessionShadow();
      if(document.getElementById('openingNextBtn')||tries>60)clearInterval(t);
    },200);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bootEmployeeShadow,{once:true});else bootEmployeeShadow();

  window.KASDMV1={
    call,
    status:()=>call('status'),
    mySchedule:(date=todayJakarta())=>call('my_schedule',{date}),
    listMappings:()=>call('list_mappings'),
    saveMapping:(payload)=>call('save_mapping',payload),
    listSchedules:(from,to)=>call('list_schedules',{from,to}),
    syncSchedules:(from,to)=>call('sync_schedules',{from,to}),
    gateStatus:(date=todayJakarta())=>call('gate_status',{date}),
    beginShift:(date=todayJakarta())=>call('begin_shift',{date}),
    completeHandover:(summary={},date=todayJakarta())=>call('complete_handover',{date,summary}),
    gateOverview:(date=todayJakarta())=>call('gate_overview',{date}),
    forceHandover:(session_id,reason)=>call('force_handover',{session_id,reason}),
    renderEmployeeGateShadow,
    todayJakarta,
    endpoint:ENDPOINT
  };
})();