const lib=require("./inflate.js");
const lit=[];
for(let i=0;i<288;i++) lit.push(i<144?8:i<256?9:i<280?7:8);
const t=lib.huffmanTable(lit,15);
console.log("maxBits",t.maxBits,"size",t.table.length);
const nonzero=[]; for(let i=0;i<t.table.length;i++){ if(t.table[i]){ nonzero.push([i,t.table[i]>>>16,t.table[i]&0xffff]); if(nonzero.length>6) break; } }
console.log("first entries", JSON.stringify(nonzero));
console.log("at 0xC80:", t.table[0xC80], "expect symbol 104 bits 8");
console.log("ffill", (t.table[0]>>>16), (t.table[0]&0xffff));
