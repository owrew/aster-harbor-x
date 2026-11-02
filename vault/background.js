importScripts('extract.js');
let chain=Promise.resolve();
const allowed=sender=>sender.tab && /^https:\/\/(?:[^/]+\.)?(?:x|twitter)\.com\//.test(sender.url||'');
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(msg?.app!=='dmvault')return;
  chain=chain.catch(()=>{}).then(async()=>{
    const all=await chrome.storage.local.get(null);
    if(msg.op==='session')return {session:all['session:'+sender.tab?.id]};
    if(msg.op==='library'){await chrome.tabs.create({url:chrome.runtime.getURL('manager.html')});return {ok:true};}
    if(msg.op==='state')return all;
    if(msg.op==='select'){
      if(!allowed(sender))throw Error('Open an X conversation first');
      const scope=DMV.conversation(sender.tab.url);
      if(!scope || scope!==msg.scope)throw Error('The selected DM must match the current tab URL');
      await chrome.storage.local.set({['session:'+sender.tab.id]:{scope,enabled:true,epoch:Date.now()}});
      return {ok:true};
    }
    if(msg.op==='pause'){
      const key='session:'+sender.tab?.id;
      await chrome.storage.local.set({[key]:{...all[key],enabled:false}});return {ok:true};
    }
    if(msg.op==='record'||msg.op==='limit'||msg.op==='checkpoint'){
      if(!allowed(sender))throw Error('Invalid source');
      const session=all['session:'+sender.tab.id];
      if(!session?.enabled||session.scope!==msg.scope||DMV.conversation(sender.tab.url)!==msg.scope)return {ignored:true};
      if(msg.op==='limit'){
        const until=Math.max(all.cooldownUntil||0,Math.min(Number(msg.until)||Date.now()+900000,Date.now()+86400000));
        await chrome.storage.local.set({cooldownUntil:until,lastLimit:msg.status});return {ok:true};
      }
      const convKey='chat:'+msg.scope, conv=all[convKey]||{scope:msg.scope,created:Date.now(),count:0};
      if(msg.op==='checkpoint'){
        await chrome.storage.local.set({[convKey]:{...conv,checkpoint:msg.progress,updated:Date.now()}});return {ok:true};
      }
      const changes={};let added=0;
      for(const id of (msg.ids||[]).slice(0,2000)){
        if(!DMV.valid(id))continue;
        const key='post:'+msg.scope+':'+id,existing=all[key];
        const media=(msg.media||[]).filter(m=>m.id===id).slice(0,8).filter(m=>{
          try{const u=new URL(m.url);return u.protocol==='https:'&&/^(video|pbs)\.twimg\.com$/.test(u.hostname);}catch{return false;}
        });
        if(existing){if(media.length)changes[key]={...existing,media};continue;}
        changes[key]={id,scope:msg.scope,url:'https://x.com/i/status/'+id,firstSeen:Date.now(),source:msg.source||'network',media};added++;
      }
      changes[convKey]={...conv,count:conv.count+added,updated:Date.now()};
      await chrome.storage.local.set(changes);return {added};
    }
    if(msg.op==='import'){
      if(!sender.url?.startsWith(chrome.runtime.getURL('manager.html')))throw Error('Import is available only in the extension manager');
      const changes={};let added=0;
      for(const row of (msg.rows||[]).slice(0,2000)){
        if(!DMV.valid(row.id)||!/^[A-Za-z0-9_-]{1,150}$/.test(row.scope))continue;
        const key='post:'+row.scope+':'+row.id;if(all[key]||changes[key])continue;
        changes[key]={scope:row.scope,id:row.id,url:'https://x.com/i/status/'+row.id,firstSeen:Date.now(),source:'offline import',media:[]};
        const ck='chat:'+row.scope,conv=changes[ck]||all[ck]||{scope:row.scope,created:Date.now(),count:0};
        changes[ck]={...conv,count:conv.count+1,updated:Date.now()};added++;
      }
      await chrome.storage.local.set(changes);return {added};
    }
    throw Error('Unknown operation');
  });
  chain.then(reply,e=>reply({error:e.message}));return true;
});
// Tab IDs may be reused after a browser restart; never reactivate another tab's session.
chrome.runtime.onStartup.addListener(async()=>{
  const data=await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(data).filter(k=>k.startsWith('session:')));
});
