const zlib=require("zlib");
const lib=require("./inflate.js");
const text="hello world";
const raw=zlib.deflateRawSync(Buffer.from(text));
console.log("raw", raw.toString("hex"));
const lit=[];
for(let i=0;i<288;i++) lit.push(i<144?8:i<256?9:i<280?7:8);
const t=lib.huffmanTable(lit,15);
// 尝试用同样逻辑解码
const data=new Uint8Array(raw.length+8); data.set(raw,0);
let pos=0,bb=0,bc=0;
function need(n){while(bc<n){bb|=data[pos++]<<bc;bc+=8;}}
function take(n){if(!n)return 0;need(n);const v=bb&((1<<n)-1);bb>>>=n;bc-=n;return v;}
function dec(tb){need(tb.maxBits);const e=tb.table[bb&((1<<tb.maxBits)-1)];if(!e)throw new Error("bad");const b=e>>>16;bb>>>=b;bc-=b;return e&0xffff;}
console.log("bfinal",take(1),"btype",take(2));
let out="";
for(let i=0;i<20;i++){const s=dec(t); if(s===256){console.log("end");break;} if(s<256) out+=String.fromCharCode(s); else {console.log("len sym",s);break;}}
console.log("decoded:", JSON.stringify(out));
console.log("table0", t.table[0], "table1", t.table[1]);
