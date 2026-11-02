/* Local support badge. No remote scripts, embedded payments, or background requests. */
(() => {
  const DEFAULT_URL='https://ko-fi.com/Z3J629YD9V';
  function mount(target){
    if(!target||target.querySelector('[data-aster-support]'))return;
    const host=document.createElement('div');host.dataset.asterSupport='true';
    host.style.cssText='display:block;margin-top:12px';
    const shadow=host.attachShadow({mode:'open'});
    shadow.innerHTML='<style>:host{font:12px/1.4 "Segoe UI",sans-serif}nav{display:flex;gap:5px;align-items:center}a,button{font:inherit;border:1px solid #72a4f2;border-radius:7px;padding:7px 9px;color:#12315a;background:#72a4f2;text-decoration:none;cursor:pointer}a{flex:1;font-weight:600;text-align:center}button{background:#eef5ff}a:focus-visible,button:focus-visible{outline:3px solid #5b4dd8;outline-offset:2px}figure{margin:8px 0 0;padding:8px;background:white;border-radius:9px;border:1px solid #b8c9e0;text-align:center;color:#193052}img{display:block;max-width:100%;width:160px;height:auto;margin:auto}figcaption{font-size:11px;margin-top:5px}</style><nav aria-label="Support the maintainer"><a target="_blank" rel="noopener noreferrer">☕ Support on Ko-fi</a><button type="button" aria-expanded="false" aria-label="Show Ko-fi QR code">QR</button></nav><figure hidden><img alt="Ko-fi QR code supplied by Awais Ali Rafaqat"><figcaption>Support Awais Ali Rafaqat</figcaption></figure>';
    target.append(host);
    const link=shadow.querySelector('a'),button=shadow.querySelector('button'),figure=shadow.querySelector('figure');
    button.onclick=()=>{
      figure.hidden=!figure.hidden;button.setAttribute('aria-expanded',String(!figure.hidden));
      if(!figure.hidden)shadow.querySelector('img').src=chrome.runtime.getURL('support-qr.webp');
    };
    async function update(){
      const {preferences={}}=await chrome.storage.local.get('preferences');
      const value=typeof preferences.supportUrl==='string'?preferences.supportUrl:DEFAULT_URL;
      if(!value){host.hidden=true;return;}
      try{
        const url=new URL(value);
        if(url.protocol!=='https:'||!['ko-fi.com','www.patreon.com','patreon.com','paypal.me','www.paypal.com','buymeacoffee.com','www.buymeacoffee.com'].includes(url.hostname))throw Error();
        host.hidden=false;link.href=url.href;
        const own=url.hostname==='ko-fi.com'&&url.pathname.toUpperCase()==='/Z3J629YD9V';
        link.textContent=own?'☕ Support on Ko-fi':'Support this project';button.hidden=!own;
        if(!own){figure.hidden=true;button.setAttribute('aria-expanded','false');}
      }catch{host.hidden=true;}
    }
    update().catch(()=>{host.hidden=true;});
    const changed=changes=>{if(changes.preferences)update().catch(()=>{});};
    chrome.storage.onChanged.addListener(changed);
  }
  globalThis.AsterSupport={mount};
  function autoMount(){
    document.querySelectorAll('.sidebar-bottom').forEach(mount);
    if(document.body?.classList.contains('popup'))mount(document.body);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoMount,{once:true});else autoMount();
})();
