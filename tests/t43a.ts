import { decideDevice, describeDevice, checkDevice, isValidDeviceId } from '../packages/core/devices/devices';
let ok=0,bad=0; const eq=(n:string,a:any,b:any)=>{ if(JSON.stringify(a)===JSON.stringify(b)) ok++; else {bad++;console.log('BAD',n,JSON.stringify(a),JSON.stringify(b));} };
eq('known',decideDevice([{device_id:'a'},{device_id:'b'}],'b'),'known');
eq('register',decideDevice([{device_id:'a'}],'b'),'register');
eq('blocked',decideDevice([{device_id:'a'},{device_id:'b'}],'c'),'blocked');
eq('ua',describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36 Edg/120'),'Edge on Windows');
eq('ua2',describeDevice('Mozilla/5.0 (Linux; Android 13) Chrome/119 Mobile Safari/537.36'),'Chrome on Android');
eq('ua3',describeDevice(null),'unknown browser on unknown system');
eq('id',[isValidDeviceId('3f2b8c1e-9a4d-4e0b-8c11-0d6a1f5e7b22'),isValidDeviceId('x'),isValidDeviceId(undefined)],[true,false,false]);
// fake db
const rows:any[]=[];
const mk=(over?:string)=>({from:(t:string)=>{ let f:any={}; const b:any={
 select(){return b}, eq(k:string,v:any){f[k]=v;return b}, order(){return b},
 insert(r:any){ if(over) return Promise.resolve({error:{message:over}}); rows.push(r); return Promise.resolve({error:null}) },
 update(u:any){ return {eq(k:string,v:any){ return {eq(k2:string,v2:any){ const r=rows.find(x=>x[k]===v&&x[k2]===v2); if(r) Object.assign(r,u); return Promise.resolve({error:null}) }}}} },
 then(res:any){ return Promise.resolve({data: rows.filter(r=>r.auth_user_id===f.auth_user_id), error:null}).then(res) } }; return b }});
(async()=>{
 const db:any=mk(); const D=(n:string)=>`aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa${n}`;
 const base={authUserId:'u1',ip:'1.1.1.1',userAgent:'Chrome/1 Windows',exempt:false};
 eq('first',(await checkDevice(db,{...base,deviceId:D('1')})).decision,'register');
 eq('second',(await checkDevice(db,{...base,deviceId:D('2')})).decision,'register');
 eq('third blocked',(await checkDevice(db,{...base,deviceId:D('3')})).allowed,false);
 eq('first again',(await checkDevice(db,{...base,deviceId:D('1')})).decision,'known');
 eq('rows',rows.length,2);
 eq('other user ok',(await checkDevice(db,{...base,authUserId:'u2',deviceId:D('3')})).allowed,true);
 eq('exempt',(await checkDevice(db,{...base,deviceId:D('9'),exempt:true})).decision,'exempt');
 eq('no cookie open',(await checkDevice(db,{...base,deviceId:undefined})).allowed,true);
 eq('touch later',(await checkDevice(db,{...base,deviceId:D('1')},new Date(Date.now()+3600000))).decision,'known');
 eq('last_seen updated',new Date(rows[0].last_seen).getTime()>Date.now()+3000000,true);
 const broken:any={from:()=>{throw new Error('down')}};
 eq('fail open',(await checkDevice(broken,{...base,deviceId:D('1')})).allowed,true);
 console.log(ok,'ok',bad,'bad');
})();
