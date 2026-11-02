const send=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,...data});
send('state').then(data=>{
  const rows=Object.entries(data).filter(([key])=>key.startsWith('videoDownload:')).map(([,v])=>v).sort((a,b)=>b.at-a.at);
  const root=document.querySelector('#activity');
  if(!rows.length){const p=document.createElement('p');p.className='empty';p.textContent='No picker downloads yet. Open a saved post and choose Download video.';root.append(p);}
  for(const row of rows.slice(0,200)){
    const article=document.createElement('article'),a=document.createElement('a'),small=document.createElement('small');
    a.href='https://x.com/i/status/'+row.id;a.textContent='Post '+row.id+' · Video '+(row.index+1);a.target='_blank';a.rel='noopener';
    small.textContent=new Date(row.at).toLocaleString()+' — Sent to downloader';article.append(a,small);root.append(article);
  }
});
document.querySelector('#native').onclick=()=>send('legacySettings');
