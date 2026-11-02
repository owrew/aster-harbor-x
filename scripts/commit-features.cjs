// One-time, signed, real-snapshot history preparation. No token handling, pushing, or backdating.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),planPath=path.join(__dirname,'commit-plan.json'),raw=fs.readFileSync(planPath);
const digest=bytes=>crypto.createHash('sha256').update(bytes).digest('hex');
const plan=JSON.parse(raw),applying=process.argv.includes('--apply');
function git(args,input){return cp.execFileSync('git',args,{cwd:root,input,encoding:input?'utf8':'utf8',maxBuffer:16*1024*1024,stdio:['pipe','pipe','pipe']}).trim();}
const gitDir=path.resolve(root,git(['rev-parse','--git-dir'])),statePath=path.join(gitDir,'aster-batch-state.json');
if(git(['diff','--cached','--name-only']))throw Error('Pre-existing staged work must be preserved; refusing to proceed.');
let state=fs.existsSync(statePath)?JSON.parse(fs.readFileSync(statePath)):{plan:digest(raw),completed:[],head:plan.base};
if(state.plan!==digest(raw))throw Error('Batch plan differs from recorded progress.');
if(git(['rev-parse','HEAD'])!==state.head)throw Error('HEAD does not match the pinned base or recorded batch progress.');
if(state.completed.length===plan.groups.length)throw Error('Batch already completed. Do not recreate history on main.');
function bytesFor(entry){
 if(entry.delete)return null;
 if(entry.self)return raw;
 const bytes=entry.base64?Buffer.from(entry.base64,'base64'):fs.readFileSync(path.join(root,entry.path));
 if(digest(bytes)!==entry.sha256)throw Error('Input changed: '+entry.path);
 return bytes;
}
for(const group of plan.groups)for(const entry of group.files){
 if(entry.path.startsWith('/')||entry.path.includes('..')||/^(?:\.git\/|node_modules\/|work\/)|(^|\/)\.env$|\.(?:pem|key)$/.test(entry.path))
   throw Error('Unsafe/private plan path: '+entry.path);
 bytesFor(entry);
}
console.log(JSON.stringify({base:plan.base,upstreamCommits:plan.upstreamCommits,featureGroups:plan.groups.length,alreadyCompleted:state.completed.length,planSha256:digest(raw),apply:applying}));
for(let i=state.completed.length;i<plan.groups.length;i++){
 const group=plan.groups[i];console.log((i+1)+'. '+group.message+' ['+group.files.length+' files]');
 if(!applying)continue;
 if(digest(fs.readFileSync(planPath))!==state.plan)throw Error('Plan changed during execution.');
 for(const entry of group.files){
   if(entry.delete){git(['update-index','--force-remove','--',entry.path]);continue;}
   const blob=git(['hash-object','-w','--path='+entry.path,'--stdin'],bytesFor(entry));
   git(['update-index','--add','--cacheinfo',entry.mode||'100644',blob,entry.path]);
 }
 if(!git(['diff','--cached','--name-only']))throw Error('Empty feature group: '+group.message);
 git(['commit','--gpg-sign','-m',group.message]);
 const sha=git(['rev-parse','HEAD']);
 git(['verify-commit',sha]);
 state.completed.push({index:i,message:group.message,sha});state.head=sha;
 fs.writeFileSync(statePath,JSON.stringify(state,null,2));
}
if(applying){
 if(git(['status','--porcelain']))throw Error('Final working tree is not clean; inspect residual files before pushing.');
 git(['fsck','--full','--strict']);
 console.log(JSON.stringify({completed:state.completed.length,totalCommits:Number(git(['rev-list','--count','HEAD'])),head:state.head,signedAndLocallyVerified:true}));
}
