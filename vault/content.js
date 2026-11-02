(() => {
  const send=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,...data});
  let state={},session=null,scope='',epoch=0,scroller=null,auto=false,timer=null,steps=0,stalls=0,previousScope='',host,pendingPick=null,pickDocs=[];
  const route=()=>{try{const m=new URL(top.location.href).pathname.match(/^\/(?:messages|i\/chat|i\/xchat|chat)\/([A-Za-z0-9_-]+)\/?$/);return m?.[1]||'';}catch{return '';}};
  function config(){
    window.postMessage({dmVault:'config',enabled:!!session?.enabled && scope===route(),scope,epoch},location.origin);
  }
  async function refresh(){
    try{
      state=await send('state');const now=route();
      if(previousScope!==now){previousScope=now;stopAuto('Conversation changed. Automatic scrolling stopped.');}
      // This session is tab-specific. The worker uses the sender tab ID for writes.
      const tabSession=await chrome.runtime.sendMessage({app:'dmvault',op:'session'});
      session=tabSession?.session;scope=session?.scope||'';epoch=session?.epoch||0;config();
      if(Date.now()<(state.cooldownUntil||0))stopAuto('Rate limit: automatic scrolling paused.');
      render();
    }catch(e){if(host)note('Extension disconnected. Refresh this page after reloading the extension.');}
  }
  window.addEventListener('message',async e=>{
    const d=e.data;if(e.source!==window||d?.dmVault!=='data'||d.scope!==scope||route()!==scope||!session?.enabled)return;
    try{
      if(d.kind==='links')await send('record',{scope,ids:d.ids,media:d.media,source:'DM network'});
      if(d.kind==='limit'){stopAuto('Rate limit detected. Progress saved.');await send('limit',{scope,until:d.until,status:d.status});}
      await refresh();
    }catch(e){note('Saving failed: '+e.message);}
  });
  // Each permitted frame observes its own DOM, but only the top frame draws controls.
  async function domScan(){
    if(!session?.enabled||scope!==route())return;
    const roots=document.querySelectorAll('[data-testid*="messageEntry"],[data-testid="DmMessage"],[data-testid*="DMMessage"],[data-testid="xchatEmbedRoute"]');
    const ids=new Set();let count=0;
    for(const root of roots)for(const a of root.querySelectorAll('a[href]')){
      const u=a.getAttribute('href')||'';
      for(const id of DMV.text(u))ids.add(id);if(++count>=2000)break;
    }
    if(ids.size)await send('record',{scope,ids:[...ids],source:'DM DOM'});
  }
  function note(text){if(host)host.shadowRoot.querySelector('#note').textContent=text;}
  function stopAuto(text){auto=false;clearTimeout(timer);timer=null;if(pendingPick){for(const doc of pickDocs)doc.removeEventListener('click',pendingPick,true);pendingPick=null;pickDocs=[];}if(text)note(text);}
  function chooseScroller(){
    stopAuto();note('Click inside the message history to choose its scrolling area.');
    const pick=e=>{
      if(e.composedPath().includes(host))return;
      e.preventDefault();e.stopImmediatePropagation();
      let el=e.composedPath()[0]||e.target;
      while(el && !(el.scrollHeight>el.clientHeight+80 && /auto|scroll/.test(getComputedStyle(el).overflowY)))el=el.parentElement;
      for(const doc of pickDocs)doc.removeEventListener('click',pick,true);
      pickDocs=[];
      pendingPick=null;
      if(!el)return note('No scrollable area found. Try clicking a message inside the history.');
      scroller=el;note('Message history selected. Start older-message scrolling when ready.');
    };
    pendingPick=pick;pickDocs=[document];
    for(let i=0;i<pickDocs.length && i<20;i++){
      for(const frame of pickDocs[i].querySelectorAll('iframe')){
        try{if(frame.contentDocument&&!pickDocs.includes(frame.contentDocument))pickDocs.push(frame.contentDocument);}catch{}
      }
    }
    for(const doc of pickDocs)doc.addEventListener('click',pick,true);
  }
  async function step(){
    if(!auto)return;
    await refresh();
    if(!auto)return;
    if(!session?.enabled||scope!==route()||Date.now()<(state.cooldownUntil||0)||document.hidden||!scroller?.isConnected)
      return stopAuto('Paused. Check the selected conversation, cooldown, and message area.');
    if(steps>=50)return stopAuto('50-step session finished. Saved links remain available; start again to continue.');
    const before=scroller.scrollTop;
    scroller.scrollBy({top:-Math.max(150,scroller.clientHeight*.65),behavior:'instant'});
    steps++;
    stalls=Math.abs(scroller.scrollTop-before)<2?stalls+1:0;
    await domScan();
    await send('checkpoint',{scope,progress:{scrollTop:scroller.scrollTop,steps,at:Date.now(),status:'partial'}});
    note('Loading older messages slowly. Step '+steps+' of 50. Five unchanged steps will stop this session.');
    if(stalls>=5)return stopAuto('No further scroll movement detected. This does not prove the full history was collected.');
    timer=setTimeout(step,15000);
  }
  function render(){
    if(!host)return;
    const $=s=>host.shadowRoot.querySelector(s),current=route(),chat=state['chat:'+scope];
    $('#count').textContent=(chat?.count||0)+' saved posts';
    $('#scope').textContent=scope?'Selected DM: '+scope:'Open a DM and choose Collect this DM.';
    $('#status').textContent=Date.now()<(state.cooldownUntil||0)?'Cooldown until '+new Date(state.cooldownUntil).toLocaleTimeString():
      session?.enabled&&scope===current?'Collecting this DM. Links saved on this device.':'Paused outside the selected DM.';
  }
  function panel(){
    host=document.createElement('div');host.id='dm-vault-panel';document.documentElement.append(host);
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML='<style>:host{position:fixed;right:14px;bottom:14px;z-index:2147483647;font:13px/1.45 "Segoe UI",sans-serif;color:#173047}section{width:306px;max-width:85vw;background:#f5f9fc;border:1px solid #a8bbc9;border-radius:12px;box-shadow:0 6px 30px #102d4433;padding:13px}header{display:flex;align-items:center;justify-content:space-between}strong{font-size:16px}button{font:inherit;cursor:pointer;border:1px solid #a8bbc9;background:white;color:#173047;border-radius:6px;padding:6px 8px}button:focus-visible{outline:3px solid #286fb8}button.primary{background:#245e92;color:white}nav{display:flex;gap:5px;flex-wrap:wrap}p{margin:9px 0;overflow-wrap:anywhere}#scope{font-size:11px;color:#526b7e}#count{font-weight:700;font-size:18px;margin:6px 0}#note{font-size:12px}input{width:95%;padding:6px;margin:8px 0}small{display:block;color:#526b7e;margin-top:8px}</style><section><header><strong>DM Link Vault</strong><button id="min" aria-expanded="true">Minimize</button></header><div id="count"></div><div id="body"><p id="scope"></p><p id="status"></p><nav><button class="primary" id="select">Collect this DM</button><button id="pause">Pause</button><button id="library">Saved links</button></nav><p>Older messages</p><nav><button id="choose">Choose message area</button><button id="start">Start slow scroll</button><button id="stop">Stop scrolling</button></nav><input id="paste" aria-label="Paste a post link" placeholder="Paste a post link from the preview menu"><button id="add">Save pasted link</button><p id="note" role="status">Automatic scrolling is optional. Select the message area first.</p><small>Progress survives refresh. Scrolling always needs a new Start after refresh.</small></div></section>';
    const $=s=>shadow.querySelector(s);
    $('#min').onclick=()=>{const body=$('#body');body.hidden=!body.hidden;$('#min').textContent=body.hidden?'Expand':'Minimize';$('#min').setAttribute('aria-expanded',String(!body.hidden));};
    $('#select').onclick=async()=>{
      const current=route();if(!current)return note('Open the full DM conversation. Its URL must contain the conversation ID.');
      const r=await send('select',{scope:current});if(r?.error)return note(r.error);await refresh();await domScan();note('Selected this DM. Refreshes keep its saved links and collection setting.');
    };
    $('#pause').onclick=async()=>{stopAuto();await send('pause');await refresh();};
    $('#library').onclick=()=>send('library');
    $('#choose').onclick=chooseScroller;
    $('#start').onclick=async()=>{
      await refresh();
      if(!scroller)return note('Choose the message area first.');
      if(!session?.enabled||route()!==scope)return note('Select this DM before starting.');
      if(Date.now()<(state.cooldownUntil||0))return note('Wait for the cooldown to finish, then start manually.');
      stopAuto();auto=true;steps=0;stalls=0;step();
    };
    $('#stop').onclick=()=>stopAuto('Automatic scrolling stopped. Saved links are unchanged.');
    $('#add').onclick=async()=>{
      if(!session?.enabled||scope!==route())return note('Select this DM first.');
      const ids=new Set(DMV.text($('#paste').value));
      if(!ids.size)return note('No post permalink found. Use the post preview’s Copy link option.');
      const r=await send('record',{scope,ids:[...ids],source:'manual paste'});if(r.error)return note(r.error);
      $('#paste').value='';await refresh();note('Saved '+r.added+' new post links.');
    };
  }
  if(window===top){
    if(document.documentElement)panel();else document.addEventListener('DOMContentLoaded',panel,{once:true});
  }
  chrome.storage.onChanged.addListener(()=>refresh());
  setInterval(()=>{refresh().then(domScan).catch(()=>{});},2500);
  refresh();
})();
