/* Shared bounded parsers. Generic message/user/media IDs are never post IDs. */
(() => {
  const valid = x => typeof x === 'string' && /^\d{10,25}$/.test(x);
  function conversation(raw) {
    try {
      const u=new URL(raw);
      if(!/(^|\.)x\.com$|(^|\.)twitter\.com$/.test(u.hostname)) return '';
      const m=u.pathname.match(/^\/(?:messages|i\/chat|i\/xchat|chat)\/([A-Za-z0-9_-]+)\/?$/);
      return m ? m[1] : '';
    } catch { return ''; }
  }
  function decode(s) {
    return s.replace(/\\u([0-9a-f]{4})/gi,(_,v)=>String.fromCharCode(parseInt(v,16))).replace(/\\\//g,'/')
      .replace(/&amp;/g,'&').replace(/&#(?:47|x2f);/gi,'/')
      .replace(/(?:%[0-9a-f]{2})+/gi,v=>{try{return decodeURIComponent(v);}catch{return v;}});
  }
  function text(s) {
    const ids=new Set();
    if(typeof s!=='string') return [];
    s=s.slice(0,65536);
    for(let i=0;i<5;i++){
      for(const m of s.matchAll(/(?:https?:\/\/(?:www\.)?(?:x|twitter)\.com\/|(?:^|[\s"'(>])\/)(?:[A-Za-z0-9_]+\/status|i\/(?:web\/)?status)\/(\d{10,25})(?!\d)/gi)) ids.add(m[1]);
      const d=decode(s); if(d===s)break;s=d;
    }
    for(const m of s.matchAll(/[?&](?:url|target|redirect_url)=([A-Za-z0-9_+/=-]{12,32768})/gi)){
      try{
        const decoded=decode(atob(m[1].replace(/-/g,'+').replace(/_/g,'/')));
        for(const p of decoded.matchAll(/https?:\/\/(?:www\.)?(?:x|twitter)\.com\/(?:[A-Za-z0-9_]+\/status|i\/(?:web\/)?status)\/(\d{10,25})(?!\d)/gi))ids.add(p[1]);
      }catch{}
    }
    return [...ids];
  }
  function extract(root, target) {
    const ids=new Set(), media=[];
    const queue=[root],seen=new WeakSet();let head=0;
    while(head<queue.length && head<5000){
      const v=queue[head++];
      if(typeof v==='string'){if(!target)for(const id of text(v))ids.add(id);continue;}
      if(!v || typeof v!=='object' || seen.has(v))continue;
      seen.add(v);
      const typed=v.__typename==='Tweet' || (typeof v.full_text==='string' && v.user && v.id_str);
      const id=typed && (v.rest_id||v.id_str);
      if(valid(id) && (!target||id===target)){
        ids.add(id);
        const entities=v.legacy?.extended_entities||v.extended_entities;
        for(const [index,m] of (entities?.media||[]).entries()){
          const variants=(m.video_info?.variants||[]).filter(x=>x.content_type==='video/mp4').sort((a,b)=>(b.bitrate||0)-(a.bitrate||0));
          const url=variants[0]?.url || m.media_url_https;
          try {const u=new URL(url);if(u.protocol==='https:' && /^(video|pbs)\.twimg\.com$/.test(u.hostname)) media.push({id,url:u.href,type:variants.length?'video':'image',serial:index+1});}catch{}
        }
      }
      if(!target)for(const k of ['tweet_id','tweet_id_str','post_id','postId','tweetId','status_id','statusId'])if(valid(v[k]))ids.add(v[k]);
      for(const k of Object.keys(v).slice(0,250)){
        if(/^(return|child|sibling|alternate|stateNode|_owner|ref)$/.test(k))continue;
        const d=Object.getOwnPropertyDescriptor(v,k);
        if(d && 'value'in d && queue.length<6000)queue.push(d.value);
      }
    }
    return {ids:[...ids],media};
  }
  function cooldown(headers, now=Date.now()) {
    const retry=headers.get('retry-after'),reset=Number(headers.get('x-rate-limit-reset'));
    let end=now+15*60*1000;
    if(retry){const seconds=Number(retry);end=Number.isFinite(seconds)?now+seconds*1000:Date.parse(retry);}
    if(reset>0)end=Math.max(end,reset*1000);
    return Math.max(now+60000,Number.isFinite(end)?end:now+15*60*1000);
  }
  globalThis.DMV={valid,conversation,text,extract,cooldown};
})();
