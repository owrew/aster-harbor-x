document.querySelector('#open').onclick=()=>chrome.tabs.create({url:chrome.runtime.getURL('manager.html')});
