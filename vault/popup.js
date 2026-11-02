const $=s=>document.querySelector(s),send=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,...data});
const open=page=>chrome.tabs.create({url:chrome.runtime.getURL(page)});
$('#open').onclick=()=>open('manager.html');$('#activity').onclick=()=>open('downloads.html');$('#settings').onclick=()=>send('settings');
async function command(action){
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  try{
    await chrome.tabs.sendMessage(tab.id,{app:'dmvault-control',action},{frameId:0});
    $('#status').textContent=action==='stop'?'Harvesting stopped. Saved links remain.':'Choose a harvesting mode in the panel on X.';
  }catch{$('#status').textContent='Open or refresh an X tab first.';}
}
$('#start').onclick=()=>command('start');$('#stop').onclick=()=>command('stop');
(async()=>{
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  const data=await chrome.storage.local.get(['session:'+tab?.id,'preferences']);
  $('#status').textContent=data['session:'+tab?.id]?.enabled?'DM harvesting is active in this tab.':'Download-only mode. DM harvesting is stopped.';
  const url=data.preferences?.supportUrl;
  if(url){$('#support').hidden=false;$('#support').onclick=()=>chrome.tabs.create({url});}
})();
