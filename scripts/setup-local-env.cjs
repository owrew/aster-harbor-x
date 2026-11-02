const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),target=path.join(root,'.env');
if(fs.existsSync(target)){console.log('Existing .env preserved.');process.exit(0);}
fs.copyFileSync(path.join(root,'.env.example'),target,fs.constants.COPYFILE_EXCL);
console.log('Created local .env with cloud services disabled. Never commit this file.');
