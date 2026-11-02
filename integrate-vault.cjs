const fs=require('node:fs'),path=require('node:path');
const upstream=path.resolve(process.argv[2]),vault=path.resolve(process.argv[3]),output=path.resolve(process.argv[4]);
fs.cpSync(upstream,output,{recursive:true});
const original=JSON.parse(fs.readFileSync(path.join(output,'manifest.json'),'utf8'));
const standalone=JSON.parse(fs.readFileSync(path.join(vault,'manifest.json'),'utf8'));
for(const file of fs.readdirSync(vault)){
 if(file==='manifest.json'||file.endsWith('.md')||!fs.statSync(path.join(vault,file)).isFile())continue;
 fs.copyFileSync(path.join(vault,file),path.join(output,file));
}
original.name='Aster Harbor — X Media Harvester';
original.version='4.5.10';
original.version_name='1.3.0 (Media Harvest 4.5.7 fork)';
original.description='Media Harvest with persistent conversation-scoped DM post links, cooldown handling, and offline imports.';
original.background={service_worker:'vault-sw.js'};
// Replace the legacy 273 KiB in-page observer with the lightweight custom controls.
// Keep the small transaction-ID helper; the native download worker/settings remain intact.
original.content_scripts=original.content_scripts.filter(entry=>!entry.js.includes('main.js'));
original.content_scripts.push(...standalone.content_scripts);
original.web_accessible_resources=[...(original.web_accessible_resources||[]),...(standalone.web_accessible_resources||[])];
original.action.default_popup='popup.html';
original.options_ui={page:'options.html',open_in_tab:true};
original.content_security_policy={extension_pages:"script-src 'self'; object-src 'self'; connect-src 'self' https://x.com https://*.x.com https://twitter.com https://*.twitter.com; img-src 'self' data: https://pbs.twimg.com; style-src 'self' 'unsafe-inline'"};
fs.copyFileSync(path.join(vault,'extract.js'),path.join(output,'extract-isolated.js'));
fs.writeFileSync(path.join(output,'vault-sw.js'),"importScripts('sw.js','background.js');\n");
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(original,null,2));
console.log('Integrated build:',output);
