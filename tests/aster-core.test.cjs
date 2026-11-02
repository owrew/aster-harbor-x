const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.resolve(__dirname,'..'),box={URL,Date,atob};
vm.createContext(box);vm.runInContext(fs.readFileSync(path.join(root,'vault/extract.js'),'utf8'),box);
const P=box.DMV,id='1234567890123456789',other='1234567890123456790';
test('normal post links become string IDs',()=>assert.deepEqual([...P.text('https://x.com/user/status/'+id)],[id]));
test('nested encoded URLs are decoded',()=>assert.deepEqual([...P.text(encodeURIComponent(encodeURIComponent('https://twitter.com/u/status/'+id)))],[id]));
test('JSON escaped slashes work',()=>assert.deepEqual([...P.text('https:\\/\\/x.com\\/u\\/status\\/'+id)],[id]));
test('a malformed percent escape does not prevent other recovery',()=>assert.deepEqual([...P.text('%XX '+encodeURIComponent('https://x.com/u/status/'+id))],[id]));
test('unrelated hosts are not post evidence',()=>assert.equal(P.text('https://unrelated.example/u/status/'+id).length,0));
test('generic user/message/media IDs are rejected',()=>assert.equal(P.extract({__typename:'User',rest_id:id,id_str:id,message_id:id,media_id:id}).ids.length,0));
test('typed Tweet is post evidence',()=>assert.deepEqual([...P.extract({__typename:'Tweet',rest_id:id}).ids],[id]));
test('explicit post reference is evidence',()=>assert.deepEqual([...P.extract({post_id:id}).ids],[id]));
test('unsafe numeric IDs are rejected',()=>assert.equal(P.valid(Number(id)),false));
test('lookup target excludes nested quoted post',()=>assert.deepEqual([...P.extract({__typename:'Tweet',rest_id:id,quote:{__typename:'Tweet',rest_id:other}},id).ids],[id]));
test('conversation parser requires an X route',()=>{assert.equal(P.conversation('https://x.com/i/chat/example-scope'),'example-scope');assert.equal(P.conversation('https://unrelated.example/i/chat/example-scope'),'');});
test('cooldown observes retry header',()=>assert.equal(P.cooldown({get:k=>k==='retry-after'?'120':null},1000),121000));
test('default Ko-fi is the maintainer profile',()=>{
 const b={};vm.createContext(b);vm.runInContext(fs.readFileSync(path.join(root,'vault/preferences.js'),'utf8'),b);
 assert.equal(b.DMPrefs.supportUrl,'https://ko-fi.com/Z3J629YD9V');
});
test('QR is bundled and only publicly exposed to relevant hosts',()=>{
 const m=JSON.parse(fs.readFileSync(path.join(root,'vault/manifest.json')));
 const resource=m.web_accessible_resources.find(x=>x.resources.includes('support-qr.webp'));
 assert(resource);assert(!resource.matches.includes('<all_urls>'));assert(fs.statSync(path.join(root,'vault/support-qr.webp')).size>0);
});
