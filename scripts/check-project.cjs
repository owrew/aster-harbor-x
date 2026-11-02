const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),vault=path.join(root,'vault');
let checked=0;
for(const name of fs.readdirSync(vault)){
 if(name.endsWith('.js')){new vm.Script(fs.readFileSync(path.join(vault,name),'utf8'),{filename:name});checked++;}
}
if(fs.readFileSync(path.join(vault,'extract.js'),'utf8')!==fs.readFileSync(path.join(vault,'extract-isolated.js'),'utf8'))
 throw Error('The isolated parser differs from extract.js');
const sourceManifest=JSON.parse(fs.readFileSync(path.join(vault,'manifest.json')));
function references(folder,m){
 const files=[...m.content_scripts.flatMap(x=>[...(x.js||[]),...(x.css||[])]),m.background?.service_worker,m.action?.default_popup,m.options_page,m.options_ui?.page,
 ...Object.values(m.icons||{})].filter(Boolean);
 for(const name of files)if(!fs.existsSync(path.join(folder,name.split('?')[0])))throw Error('Missing manifest file: '+name);
}
references(vault,sourceManifest);
const target=process.argv[2]?path.resolve(process.argv[2]):path.join(root,'extension');
if(fs.existsSync(path.join(target,'manifest.json'))){
 const m=JSON.parse(fs.readFileSync(path.join(target,'manifest.json')));
 references(target,m);
 if(m.content_scripts.some(x=>x.js?.includes('main.js')))throw Error('Legacy whole-page observer is active');
 if(m.name!=='Aster Harbor — X Media Harvester')throw Error('Unexpected release branding');
}
for(const name of fs.readdirSync(vault).filter(x=>/\.(js|html)$/.test(x))){
 const text=fs.readFileSync(path.join(vault,name),'utf8');
 if(/storage\.ko-fi\.com\/cdn|Widget_2\.js/.test(text))throw Error('Remote Ko-fi code in '+name);
 if(/-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{50}/.test(text))throw Error('Potential secret in '+name);
}
const readme=fs.readFileSync(path.join(root,'README.md'),'utf8');
if(!readme.includes('Awais Ali Rafaqat')||!readme.includes('Elton H.Y. Chou'))throw Error('Missing author/upstream attribution');
for(const m of readme.matchAll(/(?:src="|\]\()((?:docs\/)[^"#)]+)(?:"|\))/g)){
 if(!fs.existsSync(path.join(root,m[1])))throw Error('Missing README asset/link: '+m[1]);
}
const tracked=cp.spawnSync('git',['ls-files'],{cwd:root,encoding:'utf8'});
if(tracked.status===0)for(const name of tracked.stdout.split('\n')){
 if(/(^|\/)\.env$|(^|\/)node_modules\/|(^|\/)work\//.test(name))throw Error('Local/private artifact is tracked: '+name);
}
console.log('PASS '+checked+' browser scripts parse; manifests, parser copies, support packaging, attribution, and local-artifact guards checked.');
