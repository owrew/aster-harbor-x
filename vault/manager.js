const $=s=>document.querySelector(s),send=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,...data});
let all={},rows=[],visible=100;
async function load(){
  all=await send('state');const selected=$('#chat').value,select=$('#chat');select.replaceChildren();
  const chats=Object.values(all).filter(x=>x&&x.scope&&typeof x.count==='number');
  for(const chat of chats){const opt=document.createElement('option');opt.value=chat.scope;opt.textContent=chat.scope+' ('+chat.count+')';select.append(opt);}
  if(chats.some(x=>x.scope===selected))select.value=selected;
  render();
}
function filtered(){
  const query=$('#search').value.toLowerCase();
  return Object.values(all).filter(x=>x&&x.url&&x.scope===$('#chat').value&&
    (x.id+' '+x.source).toLowerCase().includes(query)).sort((a,b)=>a.firstSeen-b.firstSeen);
}
function render(){
  rows=filtered();$('#count').textContent=rows.length+' saved post link'+(rows.length===1?'':'s');$('#results').replaceChildren();
  if(!rows.length)$('#message').textContent='No links in this selection yet. Open an X DM and choose Collect this DM, or import an archive below.';
  for(const row of rows.slice(0,visible)){
    const article=document.createElement('article'),a=document.createElement('a'),small=document.createElement('small');
    a.href=row.url;a.target='_blank';a.rel='noopener';a.textContent=row.url;
    small.textContent=new Date(row.firstSeen).toLocaleString()+' · '+row.source;article.append(a,small);
    const downloadVideo=document.createElement('button');downloadVideo.textContent='Download video';
    downloadVideo.onclick=()=>DMVideoUI.open({id:row.id,scope:row.scope});article.append(downloadVideo);
    // Only HTTPS media URLs recovered from the post response are offered; no speculative requests.
    for(const media of row.media||[]){
      const link=document.createElement('a');link.href=media.url;link.target='_blank';link.rel='noopener';
      link.textContent='Open recovered media';link.style.marginRight='12px';article.append(link);
    }
    $('#results').append(article);
  }
  $('#more').hidden=rows.length<=visible;
}
function download(name,text,type){
  const url=URL.createObjectURL(new Blob([text],{type})),a=document.createElement('a');
  a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
$('#chat').onchange=()=>{visible=100;render();};$('#search').oninput=()=>{visible=100;render();};
$('#more').onclick=()=>{visible+=100;render();};
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(rows.map(x=>x.url).join('\n'));$('#message').textContent='Copied '+rows.length+' links.';}catch{$('#message').textContent='Copy blocked. Export TXT instead.';}};
$('#txt').onclick=()=>download('dm-'+$('#chat').value+'.txt',rows.map(x=>x.url).join('\n'),'text/plain');
$('#csv').onclick=()=>download('dm-'+$('#chat').value+'.csv','conversation,post_id,url,first_seen\n'+rows.map(x=>[x.scope,x.id,x.url,new Date(x.firstSeen).toISOString()].join(',')).join('\n'),'text/csv');
$('#json').onclick=()=>download('dm-link-vault-backup.json',JSON.stringify({version:1,rows:Object.values(all).filter(x=>x&&x.id&&x.url)},null,2),'application/json');
$('#import').onclick=async()=>{
  try{
    const file=$('#file').files[0];if(!file)throw Error('Choose a file first.');
    if(file.size>100*1024*1024)throw Error('File exceeds 100 MB. Split it into smaller conversation files.');
    let text=await file.text();text=text.trim().replace(/;\s*$/,'');
    if(!text.startsWith('{')&&!text.startsWith('[')){
      const equal=text.indexOf('=');if(equal<0)throw Error('Unsupported archive format');text=text.slice(equal+1).trim();
    }
    const data=JSON.parse(text);let pending=[];
    if(data.version===1 && Array.isArray(data.rows))pending=data.rows;
    else for(const entry of Array.isArray(data)?data:[]){
      const conv=entry.dmConversation||entry.dmGroupConversation;if(!conv?.conversationId)continue;
      const scope=String(conv.conversationId);
      for(const message of conv.messages||[]){
        const value=message.messageCreate;if(!value)continue;
        for(const id of DMV.extract(value).ids)pending.push({scope,id});
      }
    }
    let added=0;
    for(let i=0;i<pending.length;i+=1000){const r=await send('import',{rows:pending.slice(i,i+1000)});if(r.error)throw Error(r.error);added+=r.added;}
    await load();$('#message').textContent='Imported '+added+' new links. Files never left this device.';
  }catch(e){$('#message').textContent='Import failed: '+e.message;}
};
load();
