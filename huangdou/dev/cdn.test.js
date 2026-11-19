const lib = require("zlib");
const https = require("https");
// 直接用一次简单请求验证 m3u8 是否需 referer：先取一个已签名地址（从上次输出）已过期，改用模块
const fs=require("fs"),vm=require("vm"),crypto=require("crypto"),os=require("os"),path=require("path"),{execFileSync}=require("child_process");
const source=fs.readFileSync(path.join(__dirname,"..","main.js"),"utf8");
function toBuf(v){return typeof v==="string"?Buffer.from(v,"latin1"):Buffer.from(v);}
const mem={};
const host={
 source:"huangdou",dramaId:id=>"huangdou:"+id,chapterId:(i,k)=>"huangdou:"+i+":"+k,
 preferredSite:()=>"https://wlzetqez.cc",log:m=>console.log("[log]",m),
 loadState:n=>mem[n]||"",saveState:(n,v)=>{mem[n]=v;},
 utf8Encode:t=>new Uint8Array(Buffer.from(String(t),"utf8")),utf8Decode:b=>toBuf(b).toString("utf8"),
 hexEncode:b=>toBuf(b).toString("hex"),hexDecode:t=>new Uint8Array(Buffer.from(String(t),"hex")),
 base64Encode:b=>toBuf(b).toString("base64"),base64Decode:t=>new Uint8Array(Buffer.from(String(t),"base64")),
 md5:b=>new Uint8Array(crypto.createHash("md5").update(toBuf(b)).digest()),
 sha256:b=>new Uint8Array(crypto.createHash("sha256").update(toBuf(b)).digest()),
 randomBytes:n=>new Uint8Array(crypto.randomBytes(n)),
 aesCbcEncrypt:(k,iv,d)=>{const c=crypto.createCipheriv("aes-"+k.length*8+"-cbc",Buffer.from(k),Buffer.from(iv));c.setAutoPadding(false);return new Uint8Array(Buffer.concat([c.update(Buffer.from(d)),c.final()]));},
 aesCbcDecrypt:(k,iv,d)=>{const c=crypto.createDecipheriv("aes-"+k.length*8+"-cbc",Buffer.from(k),Buffer.from(iv));c.setAutoPadding(false);return new Uint8Array(Buffer.concat([c.update(Buffer.from(d)),c.final()]));},
 fetch:r=>{const dir=fs.mkdtempSync(path.join(os.tmpdir(),"hd-"));const bf=path.join(dir,"b"),of=path.join(dir,"o");fs.writeFileSync(bf,r.bodyBase64?Buffer.from(r.bodyBase64,"base64"):Buffer.from(r.body||""));const a=["-sS","--max-time","25","-o",of,"-w","%{http_code}","-X",r.method||"GET","--data-binary","@"+bf];for(const k of Object.keys(r.headers||{}))a.push("-H",k+": "+r.headers[k]);a.push(r.url);let s="0";try{s=execFileSync("curl.exe",a,{encoding:"utf8"}).trim();}catch(e){}const bytes=fs.existsSync(of)?fs.readFileSync(of):Buffer.alloc(0);fs.rmSync(dir,{recursive:true,force:true});return {status:Number(s),body:bytes.toString("latin1"),headers:{}};}
};
const sandbox={host,module:{exports:{}},console,Date,Math,JSON,Uint8Array,Int32Array,Error,Promise,Number,String,Array,Object,RegExp,isNaN,parseInt};
vm.createContext(sandbox);vm.runInContext(source,sandbox,{filename:"main.js"});
const mod=sandbox.module.exports;
const d=mod.detail("9493848b8d1430fd");
const media=mod.resolveMedia({dramaId:d.drama.id,chapter:d.chapters[0],index:0,total:13});
const url=media.url;
async function head(referer){
  const args=["-sS","-o","NUL","-w","%{http_code}","--max-time","20"];
  if(referer) args.push("-H","Referer: "+referer);
  args.push(url);
  return execFileSync("curl.exe",args,{encoding:"utf8"}).trim();
}
(async()=>{
  console.log("no-referer", await head(null));
  console.log("with-referer", await head("https://wlzetqez.cc/"));
})();

