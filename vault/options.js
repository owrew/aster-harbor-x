const form=document.querySelector('#settings'),message=document.querySelector('#message');
const send=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,...data});
function fill(p){for(const[key,value]of Object.entries(p)){const input=form.elements.namedItem(key);if(input)input.type==='checkbox'?input.checked=value:input.value=value;}}
const controls=[...form.querySelectorAll('input,select,button')];controls.forEach(x=>x.disabled=true);
send('preferences').then(r=>{fill(r.preferences);controls.forEach(x=>x.disabled=false);}).catch(e=>{message.textContent='Settings could not load: '+e.message;});
form.onsubmit=async e=>{
  e.preventDefault();const p={};
  for(const key of Object.keys(DMPrefs)){
    const input=form.elements.namedItem(key);
    p[key]=input.type==='checkbox'?input.checked:input.type==='number'?Number(input.value):input.value.trim();
  }
  try{const r=await send('savePreferences',{preferences:p});if(r.error)throw Error(r.error);message.textContent='Saved. Open X tabs use these preferences immediately.';}catch(e){message.textContent=e.message;}
};
document.querySelector('#reset').onclick=()=>{fill(DMPrefs);message.textContent='Defaults loaded. Choose Save preferences to apply.';};
document.querySelector('#native').onclick=()=>send('legacySettings');
