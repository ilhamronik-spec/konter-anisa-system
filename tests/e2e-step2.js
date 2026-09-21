const puppeteer = require('puppeteer-core');
const fs = require('fs');

const BASE = process.env.KA_BASE_URL || 'http://127.0.0.1:4173';
const CHROME = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const SID = '2026-09-18-full-rifda';

function assert(cond, msg){
  if(!cond) throw new Error('ASSERT FAIL: '+msg);
}
const sleep = ms => new Promise(r=>setTimeout(r,ms));

async function text(page, sel){
  return page.$eval(sel, el=>String(el.textContent||'').trim());
}
async function ls(page,key){
  return page.evaluate(k=>{try{return JSON.parse(localStorage.getItem(k)||'null')}catch(_){return null}},key);
}
async function setLs(page,key,val){
  return page.evaluate(({key,val})=>localStorage.setItem(key,JSON.stringify(val)),{key,val});
}
async function goto(page,path){
  await page.goto(BASE+path,{waitUntil:'networkidle0',timeout:30000});
  await sleep(2200);
}
async function clickByText(page, selector, wanted){
  const ok=await page.evaluate(({selector,wanted})=>{
    const el=[...document.querySelectorAll(selector)].find(x=>String(x.textContent||'').trim().includes(wanted));
    if(!el)return false; el.click(); return true;
  },{selector,wanted});
  assert(ok,'button/tab not found: '+wanted);
  await sleep(250);
}

(async()=>{
  const results=[];
  const pass=name=>{results.push({name,ok:true});console.log('PASS',name)};
  const browser=await puppeteer.launch({
    executablePath:CHROME,
    headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox','--disable-dev-shm-usage','--window-size=1440,1000']
  });
  const page=await browser.newPage();
  page.on('console',m=>{ if(['error','warning'].includes(m.type())) console.log('BROWSER',m.type(),m.text().slice(0,500)); });
  page.on('pageerror',e=>console.log('PAGEERROR',String(e).slice(0,700)));

  try{
    // 1. KARYAWAN LOCK + INTERNAL SELF TESTS
    await goto(page,'/index.html');
    await page.evaluate(()=>localStorage.clear());
    await page.reload({waitUntil:'networkidle0'});
    await sleep(2500);
    const employeeHealth=await page.evaluate(()=>({
      runtime:document.documentElement.dataset.kaRuntimeLock,
      v44:document.documentElement.dataset.v44Selftest,
      v50:document.documentElement.dataset.v50Selftest,
      workflow:!!window.KAFeaturesV61?.workflowOk?.(),
      authority:document.documentElement.dataset.kaWorkflowAuthority,
      shift:window.KARegulationsV29?.activeShift
    }));
    assert(employeeHealth.runtime==='PASS','Karyawan V80 runtime lock != PASS');
    assert(employeeHealth.v44==='PASS','V44 balance selftest != PASS');
    assert(employeeHealth.v50==='PASS','V50 stock selftest != PASS');
    assert(employeeHealth.workflow && employeeHealth.authority==='v61','V61 workflow authority failed');
    assert(employeeHealth.shift?.id===SID,'unexpected active test shift '+JSON.stringify(employeeHealth.shift));
    pass('Karyawan V80 lock + balance/stock/workflow self-tests');

    // Create active-shift heartbeat for Purchasing and personal Purchasing session.
    const now=Date.now();
    await page.evaluate(({sid,now})=>{
      localStorage.setItem('ka_shift_autosave_v53_index',JSON.stringify([{key:'ka_shift_autosave_v53_'+sid,ts:now}]));
      localStorage.setItem('ka_shift_autosave_v53_'+sid,JSON.stringify({shiftId:sid,savedAt:now}));
      localStorage.setItem('ka_purchasing_session_v81',JSON.stringify({accountId:'acct-egi'}));
      localStorage.setItem('ka_auth_session_v81',JSON.stringify({accountId:'acct-egi'}));
    },{sid:SID,now});

    // Fixture photo.
    const pngPath='/tmp/ka-e2e-note.png';
    fs.writeFileSync(pngPath,Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2e5QAAAAASUVORK5CYII=','base64'));

    // 2. PURCHASING LOCK + AUTO IDENTITY + AUTO SHIFT
    await goto(page,'/purchasing.html');
    const pHealth=await page.evaluate(()=>({
      lock:document.documentElement.dataset.kaPurchasingLock,
      account:document.getElementById('activeUserName')?.textContent?.trim(),
      holder:document.getElementById('autoHolder')?.textContent?.trim(),
      noManual:['accountSelect','ctxDate','ctxHolder','ctxShift'].every(id=>!document.getElementById(id)),
      cats:[...document.querySelectorAll('#salesCategories [data-type]')].map(x=>x.dataset.type)
    }));
    assert(pHealth.lock==='PASS','Purchasing V83 lock != PASS');
    assert(pHealth.account==='Egi','Purchasing identity should be Egi in test');
    assert(pHealth.holder==='Rifda','Purchasing should auto-route to Rifda active shift');
    assert(pHealth.noManual,'manual account/shift selectors found');
    assert(JSON.stringify(pHealth.cats)===JSON.stringify(['package','cigarette','accessory','medicine','oil']),'5 categories mismatch');
    pass('Purchasing V83 personal account + automatic active-shift routing');

    // 3. PURCHASING SALES NOTE (PHOTO + TOTAL ONLY)
    let before=await ls(page,'ka_v29_purchasing_notes')||[];
    const salesFile=await page.$('#salesPhoto'); await salesFile.uploadFile(pngPath);
    await sleep(350);
    await page.type('#salesAmount','500000');
    await page.click('#saveSalesNote');
    await sleep(700);
    let notes=await ls(page,'ka_v29_purchasing_notes')||[];
    assert(notes.length>before.length,'sales note was not created');
    const packageNote=notes.slice().reverse().find(n=>n.type==='package'&&Number(n.amount)===500000&&n.createdByName==='Egi');
    assert(packageNote,'package note with Rp500.000 not found');
    assert(packageNote.shiftId===SID && packageNote.assignedAutomatically===true,'package note not auto-assigned to active shift');
    assert(packageNote.hasPhoto===true,'package note photo metadata missing');
    pass('Purchasing creates Paket note with photo + total only');

    // 4. PURCHASING OPERATIONAL NOTE REQUIRES DETAIL
    await clickByText(page,'.nav [data-view]','Nota Operasional');
    await page.select('#opCategory','routine');
    await page.type('#opDetail','Lampu etalase dan kabel');
    await page.type('#opAmount','125000');
    const opFile=await page.$('#opPhoto'); await opFile.uploadFile(pngPath);
    await sleep(350);
    await page.click('#saveOpNote');
    await sleep(700);
    notes=await ls(page,'ka_v29_purchasing_notes')||[];
    const opNote=notes.slice().reverse().find(n=>n.type==='operational'&&Number(n.amount)===125000&&n.description==='Lampu etalase dan kabel');
    assert(opNote,'operational note with required detail not found');
    assert(opNote.shiftId===SID,'operational note wrong shift');
    pass('Purchasing operational note: category + detail + photo + total');

    // 5. HISTORY AUTO-HIDES >24 HOURS WITHOUT DELETING SOURCE DATA
    const oldId='NBJ-OLD-E2E';
    notes.push({id:oldId,type:'package',amount:1000,shiftId:SID,shiftLabel:'18 September 2026 • Shift Full • Rifda',createdAt:new Date(Date.now()-25*60*60*1000).toISOString(),createdByName:'Egi',status:'ready'});
    await setLs(page,'ka_v29_purchasing_notes',notes);
    await clickByText(page,'.nav [data-view]','Riwayat Nota');
    await page.click('#refreshHistory'); await sleep(300);
    const historyText=await text(page,'#historyBody');
    assert(!historyText.includes(oldId),'old note >24h still visible in Purchasing history');
    assert(historyText.includes(packageNote.id)||historyText.includes(opNote.id),'fresh notes missing from history');
    const storedNotes=await ls(page,'ka_v29_purchasing_notes');
    assert(storedNotes.some(n=>n.id===oldId),'old note was deleted instead of only hidden');
    pass('Purchasing 24-hour visible history retention');

    // 6. KARYAWAN RECEIVES PURCHASING NOTES + EXACT TOTAL HARD VALIDATION
    await goto(page,'/index.html');
    await page.evaluate(()=>window.KAPurchasingV56?.refreshNotes?.());
    await sleep(300);
    const noteOptions=await page.evaluate(()=>({
      pkg:[...document.querySelectorAll('#pkgNoteV29 option')].map(o=>o.value),
      op:[...document.querySelectorAll('#opReceipt option')].map(o=>o.value)
    }));
    assert(noteOptions.pkg.includes(packageNote.id),'Paket note did not arrive in Karyawan selector');
    assert(noteOptions.op.includes(opNote.id),'Operational note did not arrive in Karyawan selector');

    // mismatch first => must not mark used.
    await page.evaluate(noteId=>{
      document.getElementById('pkgNoteV29').value=noteId;
      const p=pkgCatalog[0];
      p.purchaseQty=1;p.activeBase=7050;p.activeSell=Math.max(Number(p.activeSell||p.sell||0),8050);
    },packageNote.id);
    await page.click('#pkgPreviewTopBtn'); await sleep(350);
    let used=await ls(page,'ka_v29_used_notes')||{};
    assert(!used[packageNote.id],'mismatched Paket total incorrectly accepted');

    // exact total => allowed and note becomes used. Minimum margin exactly Rp1.000.
    await page.evaluate(noteId=>{
      document.getElementById('pkgNoteV29').value=noteId;
      const p=pkgCatalog[0];
      p.purchaseQty=1;p.activeBase=500000;p.base=500000;p.activeSell=501000;p.sell=501000;
    },packageNote.id);
    await page.click('#pkgPreviewTopBtn'); await sleep(500);
    used=await ls(page,'ka_v29_used_notes')||{};
    assert(!!used[packageNote.id],'exact Paket total did not mark note used');
    pass('Karyawan hard validation: total detail must equal Purchasing note exactly');

    // 7. SHIFT/DAY ISOLATION
    const pageNext=await browser.newPage();
    await pageNext.evaluateOnNewDocument(()=>{
      window.KA_SHIFT_CONTEXT={id:'2026-09-19-full-sifa',date:'2026-09-19',dateLabel:'19 September 2026',shift:'Full',holder:'Sifa',label:'19 September 2026 • Shift Full • Sifa'};
    });
    await goto(pageNext,'/index.html');
    const nextDayNotes=await pageNext.evaluate(()=>window.KAPurchasingV56?.listNotes?.('package')?.map(n=>n.id)||[]);
    assert(!nextDayNotes.includes(packageNote.id),'18 Sep Purchasing note leaked into 19 Sep/Sifa shift');
    await pageNext.close();
    pass('Shift/day isolation: notes do not leak to next day/other holder');

    // 8. EMPLOYEE -> ADMIN SNAPSHOT BRIDGE EXISTS AND WRITES
    await page.evaluate(()=>window.KAAdminBridgeV1?.snapshot?.());
    await sleep(200);
    const snapMap=await ls(page,'ka_admin_shift_summaries_v1')||{};
    assert(!!snapMap[SID],'Karyawan snapshot did not reach Admin summary store');
    pass('Karyawan → Admin financial snapshot bridge');

    // Put controlled E2E summaries for deterministic Admin tests.
    const summaries={
      [SID]:{
        shiftId:SID,shiftLabel:'18 September 2026 • Shift Full • Rifda',date:'2026-09-18',shift:'Full',holder:'Rifda',
        margin:425000,balance:-75000,minus:-75000,operational:125000,complete:true,savedAt:Date.now(),
        modalOpening:102500000,modalClosing:102850000,modalChange:350000,
        modalBreakdown:[{index:1,name:'BRIMO',value:10000000,filled:true}],
        stockMovement:[
          {category:'Paket',unit:'unit',opening:578,incoming:10,outgoing:8,closing:580,closingValue:8000000},
          {category:'Rokok',unit:'unit',opening:700,incoming:20,outgoing:15,closing:705,closingValue:12000000}
        ],
        operationalEntries:[{receipt:opNote.id,cat:'routine',label:'Operasional Rutin',amount:125000,note:'Lampu etalase dan kabel'}],
        debtEntries:[{debtor:'Rifda Test',type:'Hutang Karyawan',amount:500000,note:'E2E'}],
        paymentEntries:[{name:'Rifda Test',amount:200000}]
      },
      '2026-09-19-full-sifa':{
        shiftId:'2026-09-19-full-sifa',shiftLabel:'19 September 2026 • Shift Full • Sifa',date:'2026-09-19',shift:'Full',holder:'Sifa',
        margin:460000,balance:70000,minus:0,operational:90000,complete:true,savedAt:Date.now()+10,
        modalOpening:102850000,modalClosing:103290000,modalChange:440000,stockMovement:[],operationalEntries:[],debtEntries:[],paymentEntries:[]
      }
    };
    await setLs(page,'ka_admin_shift_summaries_v1',summaries);
    await page.evaluate(()=>localStorage.setItem('ka_auth_session_v81',JSON.stringify({accountId:'acct-ilham'})));

    // 9. ADMIN LOCK + MINUS/PLUS REVIEW + RETURN CORRECTION
    await goto(page,'/admin.html');
    const adminHealth=await page.evaluate(()=>({
      lock:document.documentElement.dataset.kaAdminLock,
      badge:document.getElementById('kaAdminLockBadge')?.textContent||'',
      noDebtPay:!document.querySelector('#debtPay,[data-debt-pay],[data-action="pay-debt"],button[name="payDebt"]')
    }));
    assert(adminHealth.lock==='PASS','Admin V3 lock != PASS');
    assert(adminHealth.badge.includes('LOCKED'),'Admin lock badge missing');
    assert(adminHealth.noDebtPay,'Admin contains forbidden Pay Debt action');
    pass('Admin V3 lock + no Bayar Hutang action');

    await clickByText(page,'.nav [data-view]','Cek Inputan');
    let reviewText=await text(page,'#reviewBody');
    assert(reviewText.includes('MINUS BESAR'),'Rp75.000 minus not categorized as MINUS BESAR');
    await page.select('#reviewFilter','plusbig'); await sleep(200);
    reviewText=await text(page,'#reviewBody');
    assert(reviewText.includes('PLUS / BERLEBIH BESAR'),'Rp70.000 plus not categorized as PLUS / BERLEBIH BESAR');
    await page.select('#reviewFilter',''); await sleep(150);

    const returnBtn=await page.$('[data-return="'+SID+'"]');
    assert(returnBtn,'Return-to-employee button missing');
    await returnBtn.click(); await sleep(150);
    await page.type('#returnReason','E2E: periksa kembali cash dan transaksi.');
    await page.click('#returnConfirm'); await sleep(250);
    const corr=await ls(page,'ka_admin_correction_requests_v1')||[];
    const corrRec=corr.slice().reverse().find(x=>x.shiftId===SID&&x.status==='returned');
    assert(corrRec,'Admin correction request not stored');
    pass('Admin review handles minus/plus ≥ Rp50k and returns correction');

    // 10. CORRECTION RETURNS TO THE RIGHT EMPLOYEE, THEN RESUBMIT
    await goto(page,'/index.html');
    await sleep(300);
    const banner=await page.$eval('#kaAdminCorrectionBanner',el=>({show:el.classList.contains('show'),text:el.textContent}));
    assert(banner.show && banner.text.includes('periksa kembali cash'),'correction banner did not reach Rifda shift');
    const resubmit=await page.$('#kaCorrResubmit'); assert(resubmit,'Kirim Ulang ke Admin missing');
    await resubmit.click(); await sleep(250);
    const corrAfter=await ls(page,'ka_admin_correction_requests_v1')||[];
    assert(corrAfter.find(x=>x.id===corrRec.id)?.status==='resubmitted','correction not resubmitted');
    pass('Returned correction appears in Karyawan and can be resubmitted');

    // 11. DEBT AUTO REDUCTION + AUTO HIDE WHEN PAID OFF
    await goto(page,'/admin.html');
    await clickByText(page,'.nav [data-view]','Modal & Hutang');
    await clickByText(page,'.group-tabs [data-go]','Hutang Aktif');
    let debtText=await text(page,'#debtBody');
    assert(debtText.includes('Rifda Test') && debtText.includes('300.000'),'partial payment did not reduce debt to Rp300.000');

    const sm=await ls(page,'ka_admin_shift_summaries_v1');
    sm[SID].paymentEntries=[{name:'Rifda Test',amount:500000}];
    await setLs(page,'ka_admin_shift_summaries_v1',sm);
    await page.click('#debtRefresh'); await sleep(200);
    debtText=await text(page,'#debtBody');
    assert(!debtText.includes('Rifda Test'),'fully paid debt still visible as active');
    pass('Admin debt recap auto-reduces and hides fully paid debt');

    // 12. PROFESSIONAL REPORT CONTAINS FINANCIAL, STOCK AND OPERATIONAL DETAILS
    // restore partial payment so debt is visible in report
    sm[SID].paymentEntries=[{name:'Rifda Test',amount:200000}];
    await setLs(page,'ka_admin_shift_summaries_v1',sm);
    await clickByText(page,'.nav [data-view]','Laporan & Audit');
    await page.select('#reportType','finance');
    await page.click('#reportPreview'); await sleep(200);
    const reportText=await text(page,'#reportPaper');
    assert(reportText.includes('Rekap Keuangan per Shift'),'financial report missing finance recap');
    assert(reportText.includes('Pergerakan Stok & Persediaan'),'financial report missing stock movement');
    assert(reportText.includes('Detail Biaya Operasional'),'financial report missing operational details');
    pass('Professional financial report includes stock in/out + operations');

    console.log('\n=== E2E STEP 2 RESULT ===');
    results.forEach((r,i)=>console.log(String(i+1).padStart(2,'0')+'. PASS - '+r.name));
    console.log('TOTAL PASS:',results.length);
    fs.writeFileSync('e2e-step2-result.json',JSON.stringify({pass:true,count:results.length,results},null,2));
  }catch(err){
    console.error('\nE2E STEP 2 FAILED:',err.stack||err);
    fs.writeFileSync('e2e-step2-result.json',JSON.stringify({pass:false,error:String(err.stack||err),results},null,2));
    try{await page.screenshot({path:'e2e-step2-failure.png',fullPage:true});}catch(_){}
    process.exitCode=1;
  }finally{
    await browser.close();
  }
})();