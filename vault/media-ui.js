(() => {
  globalThis.DMVideoUI = {
    async open({id,scope=''}) {
      const previous=document.activeElement;
      document.getElementById('dm-video-picker')?.remove();
      const host=document.createElement('div');host.id='dm-video-picker';
      host.style.cssText='position:fixed;inset:0;z-index:2147483647;background:#102d4470;display:grid;place-items:center';
      const shadow=host.attachShadow({mode:'open'});
      shadow.innerHTML='<style>:host{font:14px/1.5 "Segoe UI",sans-serif;color:#173047}section{background:#f5f9fc;border:1px solid #a8bbc9;border-radius:12px;padding:22px;width:390px;max-width:85vw;max-height:75vh;overflow:auto}h2{margin:0;font-size:21px}button{font:inherit;padding:8px 11px;border:1px solid #a8bbc9;background:white;color:#173047;border-radius:6px;cursor:pointer;margin:5px 5px 5px 0}button:focus-visible{outline:3px solid #286fb8}button:disabled{opacity:.6;cursor:wait}#info{overflow-wrap:anywhere}#close{float:right}small{display:block;color:#526b7e}</style><section role="dialog" aria-modal="true" aria-labelledby="title"><button id="close">Close</button><h2 id="title">Download video</h2><p id="info"></p><p id="status" role="status">Checking saved video data…</p><div id="videos"></div><button id="find">Find videos</button><button id="settings">Download settings</button><small>Choose one video to download. Nothing downloads automatically. A lookup can make X requests and is disabled during cooldown.</small></section>';
      document.documentElement.append(host);
      const $=s=>shadow.querySelector(s),request=(op,data={})=>chrome.runtime.sendMessage({app:'dmvault',op,id,scope,...data});
      $('#info').textContent='Post '+id;
      const close=()=>{document.removeEventListener('keydown',key,true);host.remove();previous?.focus?.();};
      const key=e=>{
        if(e.key==='Escape'){e.stopPropagation();close();}
        if(e.key==='Tab'){
          const controls=[...shadow.querySelectorAll('button:not([disabled])')].filter(b=>!b.hidden);
          const first=controls[0],last=controls[controls.length-1];
          if(e.shiftKey&&shadow.activeElement===first){e.preventDefault();last.focus();}
          if(!e.shiftKey&&shadow.activeElement===last){e.preventDefault();first.focus();}
        }
      };
      document.addEventListener('keydown',key,true);$('#close').onclick=close;$('#close').focus();
      $('#settings').onclick=()=>request('settings');
      let busy=false;
      async function show(lookup=false){
        if(busy)return;busy=true;$('#find').disabled=true;
        try{
          const result=await request('videos',{lookup});if(result?.error)throw Error(result.error);
          $('#videos').replaceChildren();
          const videos=result.videos||[];
          $('#status').textContent=videos.length?videos.length+' video'+(videos.length===1?'':'s')+' available.':
            lookup?'No downloadable MP4 found. The post may be unavailable or contain no supported video.':'No saved video data. Choose Find videos to look up this post.';
          $('#find').hidden=videos.length>0;
          videos.forEach((video,index)=>{
            const button=document.createElement('button');button.textContent='Download video '+(index+1);
            button.onclick=async()=>{
              button.disabled=true;
              try{
                const result=await request('downloadVideo',{index});if(result?.error)throw Error(result.error);
                $('#status').textContent='Video '+(index+1)+' sent to the downloader. Check Edge Downloads or Aria2 for completion.';
              }catch(e){$('#status').textContent='Download failed: '+e.message;}
              finally{button.disabled=false;}
            };
            $('#videos').append(button);
          });
        }catch(e){$('#status').textContent=e.message;}
        finally{busy=false;$('#find').disabled=false;}
      }
      $('#find').onclick=()=>show(true);
      await show();
    }
  };
})();
