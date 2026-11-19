const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto'),{execFileSync}=require('child_process');
const key=crypto.createHash('sha256').update('x').digest();
// 复现一次请求看响应
const url='https://wlzetqez.cc/api/ping';
const r=execFileSync('curl.exe',['-sS','-i','--max-time','20','-X','POST','-H','content-type: application/x-www-form-urlencoded','--data-binary','abc',url],{encoding:'buffer'});
console.log(r.toString('latin1').slice(0,600));
