const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'extension');
(async()=>{
 fs.mkdirSync('work',{recursive:true});
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.resolve('work/support-test-')),{channel:'msedge',headless:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 try{
  const worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host,external=[];
  ctx.on('request',r=>{if(r.url().startsWith('https://storage.ko-fi.com/'))external.push(r.url());});
  const page=await ctx.newPage();await page.goto('chrome-extension://'+id+'/manager.html');
  const widget=page.locator('[data-aster-support]');
  await widget.getByRole('link',{name:'☕ Support on Ko-fi',exact:true}).waitFor();
  assert.equal(await widget.getByRole('link').getAttribute('href'),'https://ko-fi.com/Z3J629YD9V');
  await widget.getByRole('button',{name:'Show Ko-fi QR code',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('[data-aster-support]').shadowRoot.querySelector('img').naturalWidth===820);
  assert.equal(await widget.locator('figure').isVisible(),true);
  await page.screenshot({path:path.resolve('work/support-library.png'),fullPage:true});
  await page.goto('chrome-extension://'+id+'/popup.html');
  await page.locator('[data-aster-support]').getByRole('link',{name:'☕ Support on Ko-fi',exact:true}).waitFor();
  await page.screenshot({path:path.resolve('work/support-popup.png')});
  const x=await ctx.newPage();
  await x.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:'<!doctype html><title>Synthetic X fixture</title><p>Preview fixture</p>'}));
  await x.goto('https://x.com/i/chat/example-scope');
  const panel=x.locator('#dm-vault-panel');
  await panel.locator('[data-aster-support]').getByRole('link',{name:'☕ Support on Ko-fi',exact:true}).waitFor();
  await panel.getByRole('button',{name:'Minimize',exact:true}).click();
  assert.equal(await panel.locator('[data-aster-support]').isVisible(),true);
  await panel.locator('[data-aster-support]').getByRole('button',{name:'Show Ko-fi QR code',exact:true}).click();
  await x.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('[data-aster-support]').shadowRoot.querySelector('img').naturalWidth===820);
  assert.equal(external.length,0);
  await x.screenshot({path:path.resolve('work/support-panel.png')});
  console.log('PASS Ko-fi URLs, local QR loading, popup/library/panel visibility including minimized state, and no Ko-fi widget CDN requests.');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
