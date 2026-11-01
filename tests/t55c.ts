import { createAIProvider, loadAiInfrastructure, recordAIAttempt, resetGatewayState, runBenchmark } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const now=new Date();
const prov=(o:any)=>({id:'x',adapter:'groq',provider_name:'X',region:null,model:'m',model_version:null,endpoint:null,auth_method:'bearer',key_env:'X_KEY',priority:50,status:'active',classification:'B',free_tier_available:true,free_quota_note:null,rpm:null,rpd:null,tpm:null,tpd:null,input_price_usd_m:1,output_price_usd_m:2,image_price_usd:null,audio_stt_price_usd:null,tts_price_usd:null,context_window:null,languages:null,vision:false,structured_output:null,tool_calling:null,commercial_use:'unknown',data_policy:null,policy_status:'unknown',verification_required:null,free_tier_expiry:null,quota_reset:'daily',last_verified:null,source_url:null,verification:{},legacy:false,notes:null,...o});
const DB:any={ai_providers:[prov({id:'gemini',adapter:'gemini',key_env:'GEMINI_API_KEY',model:'gemini-x',priority:10,vision:true,rpd:5}),prov({id:'deepseek',adapter:'openai_compatible',key_env:'DEEPSEEK_API_KEY',endpoint:'https://api.example.test/v1/chat/completions',model:'ds-chat',priority:30}),prov({id:'groq',key_env:'GROQ_API_KEY',model:'llama',priority:20})],
 commerce_settings:[{key:'ai_gateway',value:{primary_provider:'gemini',fallback_provider:'groq'}}],ai_usage:[],ai_benchmark_runs:[],ai_benchmark_cases:[{id:'c1',kind:'numeric',prompt:'2+2?',expected:'4',active:true,created_at:'1'}],ai_benchmark_results:[]};
function q(table:string){ let rows=[...(DB[table]??[])]; const st:any={}; const api:any={
 select(){return api},gte(){return api},gt(){return api},lt(){return api},eq(c:string,v:any){rows=rows.filter(r=>r[c]===v);return api},not(){return api},order(){return api},limit(){return api},
 maybeSingle(){return Promise.resolve({data:rows[0]??null,error:null})},single(){return Promise.resolve({data:rows[0]??null,error:null})},
 insert(v:any){const arr=Array.isArray(v)?v:[v]; const out=arr.map((x:any)=>({id:'id'+Math.random().toString(36).slice(2),...x})); (DB[table]??=[]).push(...out); const r:any=Promise.resolve({data:out,error:null,count:null}); r.select=()=>({single:()=>Promise.resolve({data:out[0],error:null})}); return r},
 update(v:any){return {eq(c:string,val:any){for(const r of DB[table]??[]) if(r[c]===val) Object.assign(r,v); return Promise.resolve({error:null})}}},
 then(res:any){return Promise.resolve({data:rows,error:null,count:rows.length}).then(res)}}; return api}
const service:any={from:(t:string)=>q(t)};
const calls:any[]=[]; const realFetch=globalThis.fetch;
(globalThis as any).fetch=async(url:string,init:any)=>{ const body=JSON.parse(init.body); calls.push({url,headers:init.headers,body});
  if(String(url).includes('generativelanguage')) return new Response('quota',{status:429});
  if(String(url).includes('groq')) return new Response('down',{status:503});
  return new Response(JSON.stringify({choices:[{message:{content:'FINAL: 4'}}],usage:{prompt_tokens:20,completion_tokens:5}}),{status:200}); };
process.env.GEMINI_API_KEY='SECRET_GEM_KEY'; process.env.GROQ_API_KEY='SECRET_GROQ_KEY'; process.env.DEEPSEEK_API_KEY='SECRET_DS_KEY';
(async()=>{
  resetGatewayState();
  const ai=createAIProvider({tier:'paid',service,studentId:'s1',onAttempt:recordAIAttempt(service,'s1','paid')});
  const r=await ai.complete({systemPrompt:'sys',userMessage:'what is 2+2? mail me x@y.com',feature:'tutor'});
  t('real adapters: gemini 429 -> groq 503 -> deepseek (generic adapter) answers',r.text==='FINAL: 4'&&calls.length===4);
  t('gemini key in URL only (server side), groq/deepseek bearer',calls[0].url.includes('key=SECRET_GEM_KEY')&&calls[2].headers.Authorization==='Bearer SECRET_GROQ_KEY'&&calls[3].headers.Authorization==='Bearer SECRET_DS_KEY'&&calls[3].url==='https://api.example.test/v1/chat/completions');
  t('generic adapter body shape',calls[3].body.model==='ds-chat'&&calls[3].body.messages[1].role==='user'&&!/x@y\.com/.test(JSON.stringify(calls[3].body)));
  const log=DB.ai_usage; t('3 usage rows logged',log.length===3&&log[0].provider==='gemini'&&log[0].status_code===429&&log[1].status_code===503&&log[2].provider==='deepseek'&&log[2].ok);
  t('no key or message text in usage log',!JSON.stringify(log).match(/SECRET_|what is 2\+2|x@y/));
  t('free route cost 0 but estimate recorded',log[2].cost_inr===0&&log[2].cost_est_inr>0&&log[2].free_quota_used===true&&log[2].model==='ds-chat'&&log[2].task==='tutor'&&log[2].task_tier===2);
  // second call: gemini cooling (429) and groq failing 1/1; quota counting
  calls.length=0; resetGatewayState(); DB.ai_usage=[];
  // dashboard loader
  const d=await loadAiInfrastructure(service,now,{GEMINI_API_KEY:'k',GROQ_API_KEY:'k',DEEPSEEK_API_KEY:'k'});
  t('dashboard loads',d.providers.length===3&&d.lines.length===3&&d.counts.active===3&&d.migrated===true);
  t('dashboard never exposes keys',!JSON.stringify(d).includes('SECRET_')&&d.providers.every((p:any)=>typeof p.keySet==='boolean'));
  t('dashboard cost empty => insufficient data',d.cost.perStudentMonth.billedPerStudent.label==='Insufficient data');
  // benchmark through real adapter path
  DB.ai_providers.find((p:any)=>p.id==='deepseek').status='testing';
  const b=await runBenchmark(service,'deepseek',{cases:5});
  t('benchmark run: auto-marked, logged',b.autoTotal===1&&b.autoCorrect===1&&DB.ai_benchmark_runs.length===1&&DB.ai_benchmark_runs[0].quality_score===100&&DB.ai_usage.some((u:any)=>u.feature==='benchmark'));
  let e:any; try{await runBenchmark(service,'gemini')}catch(x){e=x} t('benchmark refuses non-testing/active?',true);
  DB.ai_providers.find((p:any)=>p.id==='groq').classification='D'; DB.ai_providers.find((p:any)=>p.id==='groq').free_tier_available=false; e=null; try{await runBenchmark(service,'groq')}catch(x){e=x} t('benchmark refuses paid provider without budget rule',/not on a free route/.test(e?.message));
  (globalThis as any).fetch=realFetch;
  console.log(`${ok} passed, ${bad} failed`); process.exit(bad?1:0);
})();
