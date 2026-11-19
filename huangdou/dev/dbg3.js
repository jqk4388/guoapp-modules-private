const zlib=require("zlib");
const lib=require("./inflate.js");
const raw=zlib.deflateRawSync(Buffer.from("hello world"));
const lit=[]; for(let i=0;i<288;i++) lit.push(i<144?8:i<256?9:i<280?7:8);
const t=lib.huffmanTable(lit,15);
const data=new Uint8Array(raw.length+8); data.set(raw,0);
let pos=0,bb=0,bc=0;
function need(n){while(bc<n){bb|=data[pos++]<<bc;bc+=8;}}
function take(n){if(!n)return 0;need(n);const v=bb&((1<<n)-1);bb>>>=n;bc-=n;return v;}
console.log("bfinal",take(1),"btype",take(2),"bc",bc,"bb",bb.toString(2));
need(15);
console.log("bc",bc,"bb",bb,"low15",bb&0x7fff,"idx",bb&0x7fff);
const idx=bb&0x7fff;
console.log("entry",t.table[idx], "bits", t.table[idx]>>>16, "sym", t.table[idx]&0xffff);
