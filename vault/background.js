importScripts('extract.js');
importScripts('preferences.js');
let chain=Promise.resolve();
let mediaChain=Promise.resolve();
const previews=new Map();
const allowed=sender=>sender.tab && /^https:\/\/(?:[^/]+\.)?(?:x|twitter)\.com\//.test(sender.url||'');
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(msg?.app!=='dmvault')return;
  const handle=async()=>{
    const sessionKey='session:'+sender.tab?.id;
    if(msg.op==='summary'){
      const basic=await chrome.storage.local.get([sessionKey,'cooldownUntil','preferences']);
      const session=basic[sessionKey],scope=session?.scope||DMV.conversation(sender.tab?.url||'');
      const chatKey='chat:'+scope,chat=await chrome.storage.local.get(chatKey);
      const recent=(chat[chatKey]?.recent||[]).slice(-6).map(id=>'post:'+scope+':'+id);
      return {...basic,...chat,...await chrome.storage.local.get(recent),session,preferences:{...DMPrefs,...basic.preferences}};
    }
    if(msg.op==='preferences')return {preferences:{...DMPrefs,...(await chrome.storage.local.get('preferences')).preferences}};
    if(msg.op==='deletePosts'){
      if(!sender.url?.startsWith(chrome.runtime.getURL('manager.html')))throw Error('Use the saved-links library.');
      if((msg.ids||[]).length>2000)throw Error('Select at most 2,000 links for one removal.');
      const keys=(msg.ids||[]).filter(DMV.valid).slice(0,2000).map(id=>'post:'+msg.scope+':'+id);
      const existing=await chrome.storage.local.get(keys),removed=Object.keys(existing).length;
      const chatKey='chat:'+msg.scope,data=await chrome.storage.local.get(chatKey),chat=data[chatKey];
      await chrome.storage.local.remove(Object.keys(existing));
      if(chat)await chrome.storage.local.set({[chatKey]:{...chat,count:Math.max(0,chat.count-removed),recent:(chat.recent||[]).filter(id=>!msg.ids.includes(id))}});
      return {removed};
    }
    if(msg.op==='savePreferences'){
      if(!sender.url?.startsWith(chrome.runtime.getURL('')))throw Error('Open the extension settings to change preferences.');
      const p={...DMPrefs,...msg.preferences};
      if(!['system','light','dark'].includes(p.theme)||!['left','right'].includes(p.corner))throw Error('Invalid appearance setting');
      for(const [key,min,max]of[['scanDelay',400,3000],['maxCards',50,400],['scrollSeconds',15,120],['maxSteps',10,200]]){
        if(!Number.isFinite(p[key])||p[key]<min||p[key]>max)throw Error('Invalid value for '+key);
      }
      for(const key of['compact','showButtons','previewDetection'])p[key]=!!p[key];
      if(p.supportUrl){const u=new URL(p.supportUrl);if(u.protocol!=='https:'||!['ko-fi.com','www.patreon.com','patreon.com','buymeacoffee.com','www.buymeacoffee.com','paypal.me','www.paypal.com'].includes(u.hostname))throw Error('Use an HTTPS creator-support link from an approved provider.');}
      await chrome.storage.local.set({preferences:p});return {ok:true};
    }
    const keys=msg.op==='state'||msg.op==='import'?null:
      [sessionKey,'cooldownUntil','preferences','chat:'+msg.scope,'video:'+msg.id,'post:'+msg.scope+':'+msg.id,
        ...(msg.ids||[]).slice(0,2000).map(id=>'post:'+msg.scope+':'+id)];
    const all=await chrome.storage.local.get(keys);
    if(msg.op==='preview'){
      if(!allowed(sender)||DMV.conversation(sender.tab.url)!==msg.scope)return {ignored:true};
      for(const id of (msg.ids||[]).slice(0,100)){
        if(!DMV.valid(id))continue;
        const videos=(msg.media||[]).filter(m=>m.id===id).slice(0,8).filter(m=>{
          try{const u=new URL(m.url);return u.protocol==='https:'&&u.hostname==='video.twimg.com'&&/\.mp4$/i.test(u.pathname);}catch{return false;}
        }).map((m,i)=>({id,url:m.url,type:'video',serial:i+1}));
        if(videos.length)previews.set(sender.tab.id+':'+msg.scope+':'+id,videos);
      }
      while(previews.size>200)previews.delete(previews.keys().next().value);
      return {ok:true};
    }
    if(msg.op==='init'){
      if(!allowed(sender)||sender.frameId!==0)return {ok:true};
      const key='session:'+sender.tab.id;
      await chrome.storage.local.set({[key]:{...all[key],enabled:false,epoch:Date.now()}});
      return {ok:true};
    }
    if(msg.op==='settings'){await chrome.runtime.openOptionsPage();return {ok:true};}
    if(msg.op==='legacySettings'){await chrome.tabs.create({url:chrome.runtime.getURL('index.html')});return {ok:true};}
    if(msg.op==='openX'){await chrome.tabs.create({url:'https://x.com/'});return {ok:true};}
    if(msg.op==='videos'||msg.op==='downloadVideo'){
      const trustedPage=sender.url?.startsWith(chrome.runtime.getURL('manager.html'));
      if(!allowed(sender)&&!trustedPage)throw Error('Use a download button in X or the saved-links library.');
      if(!DMV.valid(msg.id))throw Error('Invalid post ID.');
      const key='video:'+msg.id,fromChat=all['post:'+msg.scope+':'+msg.id];
      const isVideo=v=>{try{const u=new URL(v.url);return u.protocol==='https:'&&u.hostname==='video.twimg.com'&&/\.mp4$/i.test(u.pathname);}catch{return false;}};
      let videos=(all[key]?.videos||fromChat?.media||previews.get(sender.tab?.id+':'+msg.scope+':'+msg.id)||[]).filter(isVideo);
      if(msg.op==='videos'){
        if(!videos.length&&msg.lookup){
          if((all.cooldownUntil||0)>Date.now())throw Error('Video lookup paused until '+new Date(all.cooldownUntil).toLocaleTimeString()+'.');
          if(!globalThis.dmVaultMediaHarvest)throw Error('Install the combined Media Harvester Downloader package to find uncached videos.');
          videos=await globalThis.dmVaultMediaHarvest.resolve(msg.id);
          await chrome.storage.local.set({[key]:{videos,updated:Date.now()}});
        }
        return {videos};
      }
      if(!Number.isInteger(msg.index)||!videos[msg.index])throw Error('Choose a video from the list first.');
      if(!globalThis.dmVaultMediaHarvest)throw Error('Use the combined extension for Media Harvest downloads.');
      const result=await globalThis.dmVaultMediaHarvest.download(msg.id,{...videos[msg.index],serial:videos[msg.index].serial||msg.index+1});
      await chrome.storage.local.set({['videoDownload:'+msg.id+':'+msg.index]:{id:msg.id,index:msg.index,at:Date.now(),status:'dispatched'}});
      return result;
    }
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
      await chrome.storage.local.set({[key]:{...all[key],enabled:false,epoch:Date.now()}});return {ok:true};
    }
    if(msg.op==='record'||msg.op==='limit'||msg.op==='checkpoint'){
      if(!allowed(sender))throw Error('Invalid source');
      const session=all['session:'+sender.tab.id];
      if(!session?.enabled||session.scope!==msg.scope||DMV.conversation(sender.tab.url)!==msg.scope||
        (msg.epoch!==undefined&&msg.epoch!==session.epoch))return {ignored:true};
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
        }).map((m,i)=>({id,url:m.url,type:m.type==='video'?'video':'image',serial:i+1}));
        if(existing){if(media.length&&JSON.stringify(media)!==JSON.stringify(existing.media))changes[key]={...existing,media};continue;}
        changes[key]={id,scope:msg.scope,url:'https://x.com/i/status/'+id,firstSeen:Date.now(),source:msg.source||'network',media};added++;
      }
      if(added)changes[convKey]={...conv,count:conv.count+added,updated:Date.now(),recent:[...new Set([...(conv.recent||[]),...Object.values(changes).map(x=>x.id)])].slice(-6)};
      if(Object.keys(changes).length)await chrome.storage.local.set(changes);return {added};
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
  };
  // A slow user-requested media lookup must never delay Stop harvesting.
  if(msg.op==='videos'||msg.op==='downloadVideo'){
    mediaChain=mediaChain.catch(()=>{}).then(handle);
    mediaChain.then(reply,e=>reply({error:e.message}));
  }else{
    chain=chain.catch(()=>{}).then(handle);
    chain.then(reply,e=>reply({error:e.message}));
  }
  return true;
});
// Tab IDs may be reused after a browser restart; never reactivate another tab's session.
chrome.runtime.onStartup.addListener(async()=>{
  const data=await chrome.storage.local.get(null);
  await chrome.storage.local.remove(Object.keys(data).filter(k=>k.startsWith('session:')));
});
