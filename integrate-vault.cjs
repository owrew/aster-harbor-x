const fs=require('node:fs'),path=require('node:path');
const upstream=path.resolve(process.argv[2]),vault=path.resolve(process.argv[3]),output=path.resolve(process.argv[4]);
fs.cpSync(upstream,output,{recursive:true});
const original=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));
const standalone=JSON.parse(fs.readFileSync(path.join(vault,'manifest.json'),'utf8'));
for(const file of fs.readdirSync(vault)){
 if(file==='manifest.json'||!fs.statSync(path.join(vault,file)).isFile())continue;
 fs.copyFileSync(path.join(vault,file),path.join(output,file));
}
original.name='Media Harvest + DM Link Vault';
original.description='Media Harvest with persistent conversation-scoped DM post links, cooldown handling, and offline imports.';
original.background={service_worker:'vault-sw.js'};
original.content_scripts.push(...standalone.content_scripts);
fs.writeFileSync(path.join(output,'vault-sw.js'),"importScripts('sw.js','background.js');\n");
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(original,null,2));
console.log('Integrated build:',output);
