(() => {
  async function apply(){
    const {preferences:p={}}=await chrome.storage.local.get('preferences');
    const dark=p.theme==='dark'||(p.theme!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme=dark?'dark':'light';
  }
  apply();chrome.storage.onChanged.addListener(changes=>{if(changes.preferences)apply();});
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change',apply);
})();
