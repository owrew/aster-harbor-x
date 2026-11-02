const {chromium}=require('playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(process.argv[2]||'outputs/dm-link-vault');
const pure={URL,Date,globalThis:null};pure.globalThis=pure;vm.createContext(pure);vm.runInContext(fs.readFileSync(path.join(root,'extract.js'),'utf8'),pure);
const P=pure.DMV,ID='2111782218087415955',OTHER='2111707693153177826';
assert.deepEqual([...P.text(encodeURIComponent(encodeURIComponent('https://x.com/user/status/'+ID)))],[ID]);
assert.equal(P.extract({id:ID,rest_id:ID,__typename:'User'}).ids.length,0);
assert.equal(P.text('https://unrelated.example/u/status/'+ID).length,0);
assert.deepEqual([...P.extract({__typename:'Tweet',rest_id:ID}).ids],[ID]);
assert.equal(P.conversation('https://x.com/i/chat/abc-def'),'abc-def');
assert.equal(P.cooldown(new Headers({'retry-after':'120'}),1000),121000);
console.log('PASS parser, encoded URLs, user/message ID rejection, conversation route and Retry-After');
(async()=>{
 const profile=fs.mkdtempSync(path.resolve('work/vault-test-'));
 const ctx=await chromium.launchPersistentContext(profile,{channel:'msedge',headless:true,args:['--disable-extensions-except='+root,'--load-extension='+root]});
 try{
  let worker=ctx.serviceWorkers()[0];
  if(!worker)worker=await ctx.waitForEvent('serviceworker',{timeout:15000});
  const ext=new URL(worker.url()).host;console.log('Loaded extension',ext);
  const page=await ctx.newPage();let requests=0;
  await page.route('https://**/*',async r=>{
    requests++;const url=r.request().url();
    if(url.includes('/RateLimit'))return r.fulfill({status:429,headers:{'retry-after':'120'},body:'{}'});
    if(url.includes('/GetPostById')){
      const id=JSON.parse(new URL(url).searchParams.get('variables')).rest_id;
      return r.fulfill({contentType:'application/json',headers:{'access-control-allow-origin':'*'},body:JSON.stringify({data:{post:{__typename:'Tweet',rest_id:id,legacy:{extended_entities:{media:[]}}},user:{__typename:'User',rest_id:OTHER}}})});
    }
    if(url.includes('/RateLimit'))return r.fulfill({status:429,headers:{'retry-after':'120'},body:'{}'});
    return r.fulfill({contentType:'text/html',body:'<!doctype html><title>DM fixture</title><div data-testid="xchatEmbedRoute"><div id="history" style="height:250px;overflow:auto"><div style="height:2500px">Message previews</div></div></div>'});
  });
  await page.goto('https://x.com/i/chat/alpha-beta');
  await page.waitForSelector('#dm-vault-panel');
  await page.getByRole('button',{name:'Collect this DM',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('#status').textContent.includes('Collecting'));
  const request=async id=>page.evaluate(id=>fetch('/i/api/graphql/hash/GetPostById?variables='+encodeURIComponent(JSON.stringify({rest_id:id}))).then(x=>x.text()),id);
  await request(ID);
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('#count').textContent==='1 saved posts');
  await page.evaluate(()=>document.querySelector('#history').scrollTop=1800);
  await page.getByRole('button',{name:'Choose message area',exact:true}).click();
  await page.locator('#history').click({position:{x:20,y:30}});
  await page.getByRole('button',{name:'Start slow scroll',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#history').scrollTop<1800);
  await page.getByRole('button',{name:'Stop scrolling',exact:true}).click();
  console.log('PASS user-selected message area, slow scroll step and manual stop');
  await page.evaluate(()=>{
    const f=document.createElement('iframe');f.id='embedded-chat';
    f.srcdoc='<div id="inner-history" style="height:150px;overflow:auto"><div style="height:2000px">Embedded history</div></div>';
    document.body.append(f);
  });
  const inner=page.frameLocator('#embedded-chat').locator('#inner-history');await inner.waitFor();
  await inner.evaluate(el=>el.scrollTop=1000);
  await page.getByRole('button',{name:'Choose message area',exact:true}).click();await inner.click({position:{x:15,y:20}});
  await page.getByRole('button',{name:'Start slow scroll',exact:true}).click();
  await page.waitForFunction(()=>document.querySelector('#embedded-chat').contentDocument.querySelector('#inner-history').scrollTop<1000);
  await page.getByRole('button',{name:'Stop scrolling',exact:true}).click();
  console.log('PASS selecting and scrolling a same-origin embedded message history');
  await request(ID);await page.reload();
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel')?.shadowRoot.querySelector('#count').textContent==='1 saved posts');
  console.log('PASS refresh persistence, per-post deduplication, typed post extraction');
  await page.goto('https://x.com/i/chat/other-chat');await page.waitForSelector('#dm-vault-panel');
  await request(OTHER);
  const manager=await ctx.newPage();await manager.goto('chrome-extension://'+ext+'/manager.html');
  let state=await manager.evaluate(()=>chrome.runtime.sendMessage({app:'dmvault',op:'state'}));
  assert.equal(Object.values(state).filter(x=>x?.url).length,1);
  console.log('PASS ignores other conversations until explicitly selected');
  await page.getByRole('button',{name:'Collect this DM',exact:true}).click();await page.waitForTimeout(250);await request(OTHER);
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('#count').textContent==='1 saved posts');
  await page.evaluate(()=>fetch('/i/api/graphql/hash/RateLimit/GetPostById?variables='+encodeURIComponent(JSON.stringify({rest_id:'2111782218087415999'}))));
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('#status').textContent.includes('Cooldown'));
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel').shadowRoot.querySelector('#count').textContent==='2 saved posts');
  await page.reload();
  await page.waitForFunction(()=>document.querySelector('#dm-vault-panel')?.shadowRoot.querySelector('#status').textContent.includes('Cooldown'));
  console.log('PASS separate DM collections and persistent rate-limit cooldown');
  await manager.reload();assert.equal(await manager.locator('#chat option').count(),2);
  await manager.locator('#search').fill(OTHER);await manager.locator('#chat').selectOption('other-chat');assert.equal(await manager.locator('article').count(),1);
  const download=manager.waitForEvent('download');await manager.getByRole('button',{name:'Export TXT',exact:true}).click();assert.match((await download).suggestedFilename(),/other-chat/);
  await manager.locator('summary').click();
  await manager.locator('#file').setInputFiles({name:'direct-messages.js',mimeType:'application/javascript',buffer:Buffer.from('window.YTD.direct_messages.part0 = '+JSON.stringify([{dmConversation:{conversationId:'offline-chat',messages:[{messageCreate:{text:'https://x.com/u/status/'+ID}}]}}]))});
  await manager.getByRole('button',{name:'Import selected file',exact:true}).click();
  try {await manager.waitForFunction(()=>document.querySelector('#message').textContent.includes('Imported 1'),null,{timeout:10000});}
  catch(e){console.log('Import UI:',await manager.locator('#message').textContent());throw e;}
  console.log('PASS library search, conversation filter, TXT export and offline archive import');
  await page.getByRole('button',{name:'Minimize',exact:true}).click();
  assert.equal(await page.locator('#dm-vault-panel').locator('#body').isVisible(),false);
  await page.screenshot({path:path.resolve('work/vault-panel.png'),fullPage:false});
  await manager.screenshot({path:path.resolve('work/vault-library.png'),fullPage:true});
  console.log('PASS minimize and rendered screenshots');
 }finally{await ctx.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
