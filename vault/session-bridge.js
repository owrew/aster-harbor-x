/* Minimal replacement for the legacy page observer. Used only on manual video lookup. */
chrome.runtime.onMessage.addListener((message,sender,reply)=>{
  if(message?.action!=='request-tx-id')return;
  const uuid=crypto.randomUUID();let timer;
  const receive=e=>{
    if(e.detail?.uuid!==uuid)return;
    cleanup();reply({status:'ok',payload:{transactionId:e.detail.value}});
  };
  const cleanup=()=>{clearTimeout(timer);document.removeEventListener('mh:tx-id:response',receive);};
  document.addEventListener('mh:tx-id:response',receive);
  timer=setTimeout(()=>{cleanup();reply({status:'error',reason:'Open the post in X before finding its videos.'});},5000);
  document.dispatchEvent(new CustomEvent('mh:tx-id:request',{detail:{uuid,...message.payload}}));
  return true;
});
