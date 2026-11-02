// Portable dependency-free ZIP writer for the generated extension only.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),cp=require('node:child_process');
const root=path.resolve(__dirname,'..'),folder=path.resolve(process.argv[2]||path.join(root,'extension'));
cp.execFileSync(process.execPath,[path.join(__dirname,'check-project.cjs'),folder],{stdio:'inherit'});
const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json')));
const table=Array.from({length:256},(_,n)=>{for(let i=0;i<8;i++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
const crc=bytes=>{let n=0xffffffff;for(const b of bytes)n=table[(n^b)&255]^(n>>>8);return(n^0xffffffff)>>>0;};
function files(dir){
 return fs.readdirSync(dir,{withFileTypes:true}).flatMap(d=>{
  if(d.name.startsWith('.')||d.name==='node_modules')return [];
  const full=path.join(dir,d.name);if(d.isDirectory())return files(full);
  if(!d.isFile()||/\.(?:map|pem|key|zip)$/i.test(d.name))return [];
  return [full];
 });
}
const local=[],central=[];let offset=0,count=0;
for(const file of files(folder)){
 const name=Buffer.from(path.relative(folder,file).split(path.sep).join('/'),'utf8'),data=fs.readFileSync(file),packed=zlib.deflateRawSync(data),sum=crc(data);
 const h=Buffer.alloc(30);h.writeUInt32LE(0x04034b50);h.writeUInt16LE(20,4);h.writeUInt16LE(0x800,6);h.writeUInt16LE(8,8);
 h.writeUInt32LE(sum,14);h.writeUInt32LE(packed.length,18);h.writeUInt32LE(data.length,22);h.writeUInt16LE(name.length,26);
 const c=Buffer.alloc(46);c.writeUInt32LE(0x02014b50);c.writeUInt16LE(20,4);c.writeUInt16LE(20,6);c.writeUInt16LE(0x800,8);c.writeUInt16LE(8,10);
 c.writeUInt32LE(sum,16);c.writeUInt32LE(packed.length,20);c.writeUInt32LE(data.length,24);c.writeUInt16LE(name.length,28);c.writeUInt32LE(offset,42);
 local.push(h,name,packed);central.push(c,name);offset+=h.length+name.length+packed.length;count++;
}
const directory=Buffer.concat(central),end=Buffer.alloc(22);end.writeUInt32LE(0x06054b50);end.writeUInt16LE(count,8);end.writeUInt16LE(count,10);end.writeUInt32LE(directory.length,12);end.writeUInt32LE(offset,16);
const dist=path.join(root,'dist');fs.mkdirSync(dist,{recursive:true});
const output=path.join(dist,'aster-harbor-'+manifest.version+'.zip');fs.writeFileSync(output,Buffer.concat([...local,directory,end]));console.log(output);
