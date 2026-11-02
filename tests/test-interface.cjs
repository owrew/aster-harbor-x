const {chromium}=require('playwright'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const root=path.resolve(process.argv[2]||'outputs/media-harvester-downloader-v1.2');
(async()=>{
 const ctx=await chromium.launchPersistentContext(fs.mkdtempSync(path.resolve('work/interface-test-')),{channel:'msedge',headless:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 try{
 let worker=ctx.serviceWorkers()[0]||await ctx.waitForEvent('serviceworker');
 const id=new URL(worker.url()).host,base='chrome-extension://'+id+'/';
 const page=await ctx.newPage();
 await page.goto(base+'options.html');
 await page.waitForFunction(()=>document.querySelector('[name=maxSteps]').value!=='');
 await page.locator('[name=theme]').selectOption('dark');
 await page.locator('[name=scanDelay]').fill('1200');
 await page.locator('[name=maxCards]').fill('100');
 await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 try{await page.waitForFunction(()=>document.querySelector('#message').textContent.startsWith('Saved.'),null,{timeout:10000});}
 catch(e){console.log('Settings error:',await page.locator('#message').textContent());console.log('Invalid controls:',await page.evaluate(()=>[...document.querySelectorAll('input,select')].filter(x=>!x.checkValidity()).map(x=>({name:x.name,value:x.value,message:x.validationMessage}))));throw e;}
 assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');
 await page.screenshot({path:path.resolve('work/settings-dark.png'),fullPage:true});
 await page.reload();assert.equal(await page.locator('[name=scanDelay]').inputValue(),'1200');
 await page.locator('[name=theme]').selectOption('light');
 await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 await page.waitForFunction(()=>document.documentElement.dataset.theme==='light');
 await page.screenshot({path:path.resolve('work/settings-light.png'),fullPage:true});
 console.log('PASS settings persistence, light/dark theme and performance preferences');
 await page.goto(base+'manager.html');
 await page.evaluate(()=>chrome.runtime.sendMessage({app:'dmvault',op:'import',rows:[
   {scope:'test-chat',id:'2111782218087415955'},{scope:'test-chat',id:'2111782218087415956'}
 ]}));
 await page.reload();await page.locator('#chat').selectOption('test-chat');
 await page.getByRole('button',{name:'Select filtered',exact:true}).click();
 assert.equal(await page.locator('#selectionCount').textContent(),'2 selected');
 page.once('dialog',d=>d.accept());
 await page.getByRole('button',{name:'Remove selected',exact:true}).click();
 await page.waitForFunction(()=>document.querySelector('#message').textContent==='Removed 2 saved links.');
 assert.equal(await page.locator('article').count(),0);
 await page.evaluate(()=>chrome.runtime.sendMessage({app:'dmvault',op:'import',rows:[
   {scope:'design-project',id:'2111782218087415955'},{scope:'saved-videos',id:'2111782218087415956'}
 ]}));
 await page.reload();await page.locator('#chat').selectOption('design-project');
 await page.screenshot({path:path.resolve('work/library-v12.png'),fullPage:true});
 console.log('PASS selection, confirmed per-chat removal and library rendering');
 await page.goto(base+'downloads.html');await page.screenshot({path:path.resolve('work/activity-v12.png'),fullPage:true});
 await page.goto(base+'popup.html');await page.screenshot({path:path.resolve('work/popup-v12.png')});
 console.log('PASS popup and download activity pages');
 const x=await ctx.newPage();
 await x.route('https://x.com/**',r=>r.fulfill({contentType:'text/html',body:'<article data-testid="tweet"><a href="/u/status/2111782218087415955">Post</a><div data-testid="videoPlayer">Preview</div></article>'}));
 await x.goto('https://x.com/i/chat/design-project');
 await x.waitForSelector('article [data-dm-video-button]');
 await x.waitForTimeout(1500);
 await worker.evaluate(()=>{
   globalThis.idleMessages=0;
   chrome.runtime.onMessage.addListener(msg=>{if(msg?.app==='dmvault')globalThis.idleMessages++;});
 });
 await x.waitForTimeout(4000);
 assert.equal(await worker.evaluate(()=>globalThis.idleMessages),0);
 console.log('PASS zero collector worker messages across 4 seconds of an unchanged idle fixture');
 await page.goto(base+'options.html');await page.locator('[name=showButtons]').uncheck();
 await page.getByRole('button',{name:'Save preferences',exact:true}).click();
 await x.waitForTimeout(1500);
 // Preference changes should update controls without a page reload.
 assert.equal(await x.locator('article [data-dm-video-button]').count(),0);
 console.log('PASS disabling download-button detection without reloading X');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
