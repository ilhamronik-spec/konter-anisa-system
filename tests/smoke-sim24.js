const puppeteer=require('puppeteer-core');

const base=process.env.KA_BASE_URL||'http://127.0.0.1:4173';
const chrome=process.env.CHROME_PATH;
if(!chrome) throw new Error('CHROME_PATH missing');

const assert=(cond,msg)=>{if(!cond)throw new Error(msg)};

(async()=>{
  const browser=await puppeteer.launch({
    executablePath:chrome,
    headless:true,
    args:['--no-sandbox','--disable-setuid-sandbox']
  });
  const page=await browser.newPage();
  const pageErrors=[];
  page.on('pageerror',e=>pageErrors.push(String(e?.stack||e?.message||e)));

  try{
    await page.goto(base+'/index.html?sim_date=2026-09-24&sim_base=2026-09-23&sim_shift=Full&sim_holder=Rifda&ci_smoke=1',{
      waitUntil:'load',timeout:30000
    });
    await new Promise(r=>setTimeout(r,2800));

    const result=await page.evaluate(()=>{
      const digits=v=>String(v??'').replace(/\D/g,'');
      const select=document.getElementById('pkgBuyType');
      if(!select) return {missing:'pkgBuyType'};
      select.value='0';
      select.dispatchEvent(new Event('change',{bubbles:true}));

      const firstBefore={
        stock:Number(pkgCatalog?.[0]?.stock),
        base:Number(pkgCatalog?.[0]?._openingBase??pkgCatalog?.[0]?.base),
        oldStock:String(document.getElementById('pkgOldStock')?.value||''),
        oldBase:digits(document.getElementById('pkgOldBase')?.value),
        toast:String(document.getElementById('uiToast')?.textContent||'')
      };

      // A physical/correction field must NEVER overwrite Stok Sistem before Admin approval.
      const correction=document.getElementById('pkgCheck1');
      if(correction) correction.value='24';
      window.KAStockV50?.sync?.();
      window.syncPkgBuy?.();

      return {
        ...firstBefore,
        stockAfterCorrection:Number(pkgCatalog?.[0]?.stock),
        oldStockAfter:String(document.getElementById('pkgOldStock')?.value||''),
        oldBaseAfter:digits(document.getElementById('pkgOldBase')?.value),
        runtimeLock:String(document.documentElement.dataset.kaRuntimeLock||''),
        rollover:window.KADayRolloverV1?.metadata?.()||{},
        toastAfter:String(document.getElementById('uiToast')?.textContent||'')
      };
    });

    assert(!result.missing,'Paket selector missing');
    assert(result.stock===38,'Sep 24 AXIS 1.5 opening stock must be 38, got '+result.stock);
    assert(result.base===7050,'Sep 24 AXIS 1.5 opening base must be 7050, got '+result.base);
    assert(result.oldStock==='38','Belanja Paket must show system stock 38, got '+result.oldStock);
    assert(result.oldBase==='7050','Belanja Paket must show base 7.050, got '+result.oldBase);
    assert(result.stockAfterCorrection===38,'Correction input leaked into system stock: '+result.stockAfterCorrection);
    assert(result.oldStockAfter==='38','Belanja stock changed after unapproved correction: '+result.oldStockAfter);
    assert(result.oldBaseAfter==='7050','Belanja base changed after unapproved correction: '+result.oldBaseAfter);
    assert(!/Maximum call stack/i.test(result.toast),'syncPkgBuy stack overflow detected');
    assert(!/Maximum call stack/i.test(result.toastAfter),'syncPkgBuy stack overflow detected after correction');
    assert(pageErrors.length===0,'Browser page errors: '+pageErrors.join(' | '));
    assert(result.runtimeLock==='PASS','Runtime lock is '+result.runtimeLock);
    assert(String(result.rollover?.rolloverFrom||'').includes('2026-09-23'),'Rollover source is not Sep 23');

    console.log('SIM24 SMOKE PASS',JSON.stringify(result));
  }finally{
    await browser.close();
  }
})().catch(e=>{console.error(e.stack||e);process.exit(1)});
