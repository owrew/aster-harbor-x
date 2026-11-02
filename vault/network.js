(() => {
  if(window.__dmVaultNetwork)return;window.__dmVaultNetwork=true;
  const P=DMV,MAX=2*1024*1024;let config=null,active=0;
  for(const name of['pushState','replaceState']){
    const original=history[name];
    history[name]=function(...args){
      const before=location.pathname,result=original.apply(this,args);
      if(before!==location.pathname)window.postMessage({dmVault:'route'},location.origin);
      return result;
    };
  }
  const send=data=>window.postMessage({dmVault:'data',...data},location.origin);
  window.addEventListener('message',e=>{
    if(e.source===window && e.data?.dmVault==='config')config=e.data;
  });
  function snapshot(raw){
    if(!config?.scope || (!config.enabled&&!config.downloads))return null;
    let topScope='';try{topScope=P.conversation(top.location.href);}catch{}
    if(topScope && topScope!==config.scope)return null;
    try{
      const u=new URL(raw,location.href);
      if(!/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname))return null;
      if(!/getpostbyid|tweetresultbyrestid|xchat|\/dm\/|directmessage|messaging|dmconversation/i.test(u.pathname))return null;
      let vars={};try{vars=JSON.parse(u.searchParams.get('variables')||'{}');}catch{}
      const cid=vars.conversation_id||vars.conversationId;
      if(cid && String(cid)!==config.scope)return null;
      const post=/getpostbyid|tweetresultbyrestid/i.test(u.pathname);
      const target=post && (vars.rest_id||vars.tweetId||vars.postId);
      // Generic/inbox responses can contain other conversations. Require explicit scope.
      if(!post && !cid && !u.pathname.includes(config.scope))return null;
      if(post && !P.valid(target))return null;
      return {scope:config.scope,epoch:config.epoch,target:target||null,collect:config.enabled};
    }catch{return null;}
  }
  function current(s){
    if((!config?.enabled&&!config?.downloads) || config.scope!==s.scope || config.epoch!==s.epoch)return false;
    try {return P.conversation(top.location.href)===s.scope;}catch{return false;}
  }
  function reference(s){
    if(!current(s))return;
    // A GetPostById request already names the post, even if its preview is rate limited.
    // Saving that explicit reference needs no retry or extra API lookup.
    if(s.target)send({kind:'preview',scope:s.scope,epoch:s.epoch,ids:[s.target],media:[]});
    if(s.target&&s.collect&&config.enabled)send({kind:'links',scope:s.scope,epoch:s.epoch,ids:[s.target],media:[]});
  }
  function report(s,status,headers,body){
    if(!current(s))return;
    if(status===429 || status===403){
      if(s.collect&&config.enabled)send({kind:'limit',scope:s.scope,epoch:s.epoch,until:status===429?P.cooldown(headers):Date.now()+30*60*1000,status});return;
    }
    if(status<200||status>=300||!body)return;
    let data;try{data=typeof body==='string'?JSON.parse(body):body;}catch{return;}
    const result=P.extract(data,s.target);
    // The requested post is itself evidence even if the response is a tombstone.
    if(s.target && !result.ids.includes(s.target))result.ids.push(s.target);
    send({kind:'preview',scope:s.scope,epoch:s.epoch,...result});
    if(s.collect&&config.enabled)send({kind:'links',scope:s.scope,epoch:s.epoch,...result});
  }
  async function read(r,s){
    if(active>=2 || Number(r.headers.get('content-length'))>MAX)return;
    active++;let reader;
    try{
      const c=r.clone();reader=c.body?.getReader();if(!reader)return;
      let size=0,body='',decoder=new TextDecoder();
      while(current(s)){
        const chunk=await reader.read();if(chunk.done)break;
        size+=chunk.value.byteLength;if(size>MAX)return;
        body+=decoder.decode(chunk.value,{stream:true});
      }
      report(s,r.status,r.headers,body+decoder.decode());
    }catch{}finally{reader?.cancel().catch(()=>{});active--;}
  }
  const fetch0=window.fetch;
  window.fetch=function(...args){
    const s=snapshot(args[0]?.url||String(args[0]));
    const promise=fetch0.apply(this,args);
    if(s)promise.then(r=>{
      reference(s);
      if(r.status===429||r.status===403)report(s,r.status,r.headers,null);
      else read(r,s);
    },()=>{});
    return promise;
  };
  const open0=XMLHttpRequest.prototype.open;
  XMLHttpRequest.prototype.open=function(method,url,...rest){
    const result=open0.call(this,method,url,...rest),s=snapshot(String(url));
    if(s)this.addEventListener('load',()=>{
      try{
        reference(s);
        const h={get:k=>this.getResponseHeader(k)};
        if(this.status===429||this.status===403)report(s,this.status,h,null);
        else if(this.responseType==='json')report(s,this.status,h,this.response);
        else if((!this.responseType||this.responseType==='text') && this.responseText.length<=MAX)report(s,this.status,h,this.responseText);
      }catch{}
    },{once:true});
    return result;
  };
})();
