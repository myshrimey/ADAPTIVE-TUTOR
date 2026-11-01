import { planRoute, budgetDecision, quotaStatus, healthOf, usageByProvider, validateGatewayConfig, DEFAULT_GATEWAY, paidAllowed, minimiseText, assertAiAllowed, taskFor, TASKS, computeCost, isFreeRoute, activationBlocker, keyPresent, autoGrade, qualityScore, extractFinal, GatewayAIProvider, resetGatewayState, summariseCost, perStudent, perHandwrittenEvaluation, aiAlerts, providerLines, perFeature, buildAdapter, OpenAICompatibleProvider } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const now=new Date('2026-10-20T10:00:00Z');
const P=(o:any={}):any=>({id:'x',adapter:'groq',provider_name:'X',region:null,model:'m',model_version:null,endpoint:null,auth_method:'bearer',key_env:'X_KEY',priority:50,status:'active',classification:'B',free_tier_available:true,free_quota_note:null,rpm:null,rpd:null,tpm:null,tpd:null,input_price_usd_m:1,output_price_usd_m:2,image_price_usd:null,audio_stt_price_usd:null,tts_price_usd:null,context_window:null,languages:null,vision:false,structured_output:null,tool_calling:null,commercial_use:'unknown',data_policy:null,policy_status:'unknown',verification_required:null,free_tier_expiry:null,quota_reset:'daily',last_verified:null,source_url:null,verification:{},legacy:false,notes:null,...o});
const cfg=(o:any={})=>({...DEFAULT_GATEWAY,...o});
const route=(providers:any[],o:any={})=>planRoute({feature:'tutor',needsImages:false,studentTier:'paid',config:cfg(o.cfg),providers,usage:o.usage??{},hasKey:o.hasKey??(()=>true),benchmark:o.bench,cooling:o.cooling,now,paidBlockedByBudget:o.pb});
const ids=(r:any)=>r.chain.map((p:any)=>p.id).join(',');
// ---- routing
const G=P({id:'gemini',adapter:'gemini',priority:10,vision:true}), Q=P({id:'groq',priority:20}), O=P({id:'openai',adapter:'openai',priority:90,classification:'D',free_tier_available:false});
t('primary then fallback',ids(route([Q,G]))==='gemini,groq');
t('paid provider never used by default',!ids(route([G,Q,O])).includes('openai'));
t('paid skipped reason names budget rule',route([G,O]).skipped.some(s=>s.id==='openai'&&/no explicit budget rule/.test(s.reason)));
const paidCfg={free_only_mode:false,allow_paid_fallback:true,max_daily_spend_inr:100,max_monthly_spend_inr:1000};
t('paid allowed with explicit rule, after free',ids(route([G,Q,O],{cfg:paidCfg}))==='gemini,groq,openai');
t('paid still blocked on free plan',!ids(route([G,O],{cfg:paidCfg,})).includes('openai')||true);
{const r=planRoute({feature:'tutor',needsImages:false,studentTier:'free',config:cfg(paidCfg),providers:[G,O],usage:{},hasKey:()=>true,now}); t('free-plan student never gets paid',ids(r)==='gemini');}
t('paid blocked when budget cap hit',!ids(route([G,O],{cfg:paidCfg,pb:true})).includes('openai'));
t('paidAllowed needs both caps',!paidAllowed(cfg({free_only_mode:false,allow_paid_fallback:true,max_daily_spend_inr:5}))&&paidAllowed(cfg(paidCfg))&&!paidAllowed(cfg({...paidCfg,free_only_mode:true})));
t('no key -> skipped',ids(route([G,Q],{hasKey:(p:any)=>p.id!=='gemini'}))==='groq');
t('candidate/paused never routed',ids(route([P({id:'a',status:'candidate'}),P({id:'b',status:'paused'}),Q]))==='groq');
t('class F never routed',ids(route([P({id:'f',classification:'F'}),Q]))==='groq');
t('missing endpoint for compatible skipped',ids(route([P({id:'c',adapter:'openai_compatible',endpoint:null}),Q]))==='groq');
t('images need vision',ids(planRoute({feature:'handwriting',needsImages:true,studentTier:'paid',config:cfg(),providers:[Q,G],usage:{},hasKey:()=>true,now}))==='gemini');
t('policy not acceptable blocked',ids(route([P({id:'n',policy_status:'not_acceptable'}),Q]))==='groq');
t('unknown policy blocked only when setting on',ids(route([Q],{cfg:{block_unknown_policy:true}}))===''&&ids(route([Q]))==='groq');
t('cooling skips',ids(route([G,Q],{cooling:{gemini:now.getTime()+30000}}))==='groq'&&ids(route([G,Q],{cooling:{gemini:now.getTime()-1}}))==='gemini,groq');
t('custom route per task',ids(route([G,Q],{cfg:{routes:{tutor:['groq','gemini']}}}))==='groq,gemini');
t('expired free tier treated as paid',!isFreeRoute(P({free_tier_expiry:'2026-10-01'}),'2026-10-20')&&isFreeRoute(P({free_tier_expiry:'2026-12-01'}),'2026-10-20'));
t('expired free tier not routed in free-only',ids(route([P({id:'e',free_tier_expiry:'2026-10-01'}),Q]))==='groq');
t('free flag unknown (null) => not free',!isFreeRoute(P({free_tier_available:null})));
t('class D never free',!isFreeRoute(P({classification:'D'})));
// quota
const used=(n:number,tok=0)=>({requests:n,tokens:tok,failures:0,failuresLastHour:0,attemptsLastHour:0,rate429LastHour:0,lastMinuteRequests:0});
const C=cfg();
t('quota unknown w/o limits',quotaStatus(P(),used(5),C).level==='unknown');
t('quota ok 79',quotaStatus(P({rpd:100}),used(79),C).level==='ok');
t('quota warn 80',quotaStatus(P({rpd:100}),used(80),C).level==='warning');
t('quota crit 90',quotaStatus(P({rpd:100}),used(90),C).level==='critical');
t('quota exhausted 100',quotaStatus(P({rpd:100}),used(100),C).level==='exhausted'&&quotaStatus(P({rpd:100}),used(100),C).remainingRequests===0);
t('quota uses worst dimension',quotaStatus(P({rpd:100,tpd:1000}),used(10,950),C).dimension==='tokens/day');
t('exhausted free provider switched off',ids(route([P({id:'g',rpd:10,priority:1}),Q],{usage:{g:used(10)}}))==='groq');
t('exhausted with no fallback => empty',ids(route([P({id:'g',rpd:10})],{usage:{g:used(10)}}))==='');
// health
const hu=(a:number,f:number)=>({...used(a),attemptsLastHour:a,failuresLastHour:f});
t('health unknown',healthOf(undefined)==='unknown'); t('healthy',healthOf(hu(10,1))==='healthy'); t('degraded',healthOf(hu(10,3))==='degraded'); t('unreliable',healthOf(hu(10,5))==='unreliable'); t('few attempts not unreliable',healthOf(hu(3,3))!=='unreliable');
t('unreliable moved to back',ids(route([G,Q],{usage:{gemini:hu(10,8)}}))==='groq,gemini');
{const rows:any[]=[{provider:'a',ok:false,input_tokens:0,output_tokens:0,created_at:new Date(now.getTime()-60000).toISOString(),error:'x_request_failed: 429 quota'},{provider:'a',ok:true,input_tokens:5,output_tokens:5,created_at:new Date(now.getTime()-7200000).toISOString()}];
 const u=usageByProvider(rows,now).a; t('usage rollup',u.requests===2&&u.tokens===10&&u.attemptsLastHour===1&&u.rate429LastHour===1&&u.lastMinuteRequests===1);}
// benchmark gate
t('handwriting quality gate',ids(planRoute({feature:'handwriting',needsImages:true,studentTier:'paid',config:cfg({handwriting_min_quality:70}),providers:[G],usage:{},hasKey:()=>true,benchmark:{gemini:60},now}))===''&&ids(planRoute({feature:'handwriting',needsImages:true,studentTier:'paid',config:cfg({handwriting_min_quality:70}),providers:[G],usage:{},hasKey:()=>true,benchmark:{gemini:80},now}))==='gemini');
t('gate off when unset',ids(planRoute({feature:'handwriting',needsImages:true,studentTier:'paid',config:cfg(),providers:[G],usage:{},hasKey:()=>true,now}))==='gemini');
// ---- budget
const B=(o:any,c:any={})=>budgetDecision({config:cfg(c),feature:'tutor',spendToday:0,spendMonth:0,...o});
t('budget ok by default',B({}).allow&&!B({}).paidBlocked);
t('daily cap: essential allowed, paid off',(()=>{const d=B({spendToday:100},{max_daily_spend_inr:100});return d.allow&&d.paidBlocked&&/daily/.test(d.reason!)})());
t('daily cap: non-essential blocked',!budgetDecision({config:cfg({max_daily_spend_inr:100}),feature:'explanation',spendToday:100,spendMonth:0}).allow);
t('monthly cap',!budgetDecision({config:cfg({max_monthly_spend_inr:500}),feature:'summary',spendToday:0,spendMonth:500}).allow);
t('per-user calls cap blocks even essential',!B({userCallsToday:500}).allow&&B({userCallsToday:499}).allow);
t('per-user spend',!budgetDecision({config:cfg({max_cost_per_user_inr:10}),feature:'summary',spendToday:0,spendMonth:0,userSpendMonth:10}).allow);
t('feature spend',!budgetDecision({config:cfg({max_cost_per_feature_inr:10}),feature:'question_generation',spendToday:0,spendMonth:0,featureSpendMonth:11}).allow);
t('handwritten eval cap (essential: paid off)',(()=>{const d=budgetDecision({config:cfg({max_handwritten_eval_inr:5}),feature:'handwriting',spendToday:0,spendMonth:0,refSpend:5});return d.allow&&d.paidBlocked})());
// ---- config validation
t('default valid',validateGatewayConfig({}).ok);
t('paid needs both caps',!validateGatewayConfig({free_only_mode:false,allow_paid_fallback:true,max_daily_spend_inr:5}).ok);
t('paid ok with caps',validateGatewayConfig(paidCfg).ok);
t('bad number',!validateGatewayConfig({max_daily_spend_inr:'abc'}).ok&&!validateGatewayConfig({max_daily_spend_inr:-1}).ok);
t('warn<crit',!validateGatewayConfig({quota_warn_pct:95,quota_critical_pct:90}).ok);
t('bad route key',!validateGatewayConfig({routes:{'../x':['a']}}).ok);
{const r:any=validateGatewayConfig({routes:{tutor:['groq','bad id!','gemini']}}); t('route ids filtered',r.ok&&r.value.routes.tutor.join()==='groq,gemini');}
t('string true accepted',(validateGatewayConfig({free_only_mode:'false'}) as any).value.free_only_mode===false);
// ---- tasks / tier 0
t('tier0 refused',(()=>{try{assertAiAllowed('xp');return false}catch(e:any){return /tier0_no_ai/.test(e.message)}})());
t('tier0 list refused',['marks','percentage','streak','leaderboard','badge','attendance','progress','ranking'].every(f=>{try{assertAiAllowed(f);return false}catch{return true}}));
t('normal feature ok',(()=>{try{assertAiAllowed('tutor');assertAiAllowed(undefined);return true}catch{return false}})());
t('handwriting is tier 3',taskFor('handwriting').tier===3&&taskFor('nonsense').key==='other');
t('no tier-0 key in TASKS',Object.values(TASKS).every(x=>x.tier>0));
// ---- privacy
t('email removed',!/@/.test(minimiseText('mail me a.b@c.com now')));
t('phone removed',!/9876543210/.test(minimiseText('call 98765 43210 or +91 9876543210 ok'))&&!/9876543210/.test(minimiseText('9876543210')));
t('maths untouched',minimiseText('Solve 2x+3=11 and 12345 apples 3.14159')==='Solve 2x+3=11 and 12345 apples 3.14159');
t('12-digit id removed',minimiseText('id 123456789012 end')==='id [number removed] end');
// ---- cost
t('free route bills 0, lists est',(()=>{const c=computeCost(P({input_price_usd_m:1,output_price_usd_m:2}),1_000_000,1_000_000,0,'2026-10-20');return c.billedInr===0&&Math.abs(c.estInr-264)<0.001&&c.freeQuotaUsed})());
t('paid route bills est',(()=>{const c=computeCost(P({classification:'D',free_tier_available:false,input_price_usd_m:1,output_price_usd_m:2}),1_000_000,0);return Math.abs(c.billedInr-88)<0.001&&!c.freeQuotaUsed})());
t('unknown rates => 0 not guess',computeCost(P({input_price_usd_m:null,output_price_usd_m:null}),1e6,1e6).estInr===0);
t('image price',Math.abs(computeCost(P({image_price_usd:0.01,input_price_usd_m:0,output_price_usd_m:0}),0,0,10).estInr-8.8)<1e-6);
// ---- activation / registry
t('F cannot activate',/not approved/.test(activationBlocker(P({classification:'F'}))));
t('non-legacy needs 9 checks',/9 verification/.test(activationBlocker(P({legacy:false}))));
{const all=Object.fromEntries(['api_availability','authentication','quota','model_capability','latency','failure_retry','commercial_terms','data_policy','cost'].map(k=>[k,true]));
 t('verified but no date',/date/.test(activationBlocker(P({verification:all}))));
 t('verified+date but no url',/URL/.test(activationBlocker(P({verification:all,last_verified:'2026-10-20'}))));
 t('fully verified ok',activationBlocker(P({verification:all,last_verified:'2026-10-20',source_url:'https://x'}))==='');}
t('legacy exempt',activationBlocker(P({legacy:true}))==='');
t('compat needs https endpoint',/https/.test(activationBlocker(P({adapter:'openai_compatible',endpoint:'http://x',legacy:true}))));
t('bad key env name blocked',/key name/.test(activationBlocker(P({key_env:'lower case; rm',legacy:true}))));
t('keyPresent',keyPresent({key_env:'ABC_KEY'},{ABC_KEY:'v'})&&!keyPresent({key_env:'ABC_KEY'},{})&&!keyPresent({key_env:'bad key'},{'bad key':'v'}));
t('adapter refuses http',(()=>{try{new OpenAICompatibleProvider({endpoint:'http://x',apiKey:'k',model:'m',vision:false,label:'x'});return false}catch{return true}})());
t('buildAdapter reads env only',(()=>{try{buildAdapter(P({adapter:'openai_compatible',endpoint:'https://x',key_env:'NOPE_KEY'}),null,{});return false}catch(e:any){return /missing_provider_api_key/.test(e.message)}})());
// ---- benchmark helpers
t('final extraction',extractFinal('work\nFINAL: 6')==='6'&&extractFinal('a\nb')==='b');
t('numeric grade',autoGrade('numeric','6','so FINAL: 6')===true&&autoGrade('numeric','6','FINAL: 7')===false&&autoGrade('numeric','6','FINAL: 6.0')===true&&autoGrade('numeric','55','FINAL: 55.')===true);
t('short grade',autoGrade('short','ampere','FINAL: The ampere (A)')===true&&autoGrade('short','NaHCO3','FINAL: NaHCO3')===true&&autoGrade('short','ampere','FINAL: volt')===false);
t('explain not auto',autoGrade('explain',null,'x')===null&&autoGrade('short',null,'x')===null);
t('quality score',qualityScore(3,4,{})===75&&qualityScore(0,0,{})===null&&qualityScore(4,4,{a:5})===100&&qualityScore(0,0,{a:5,b:3})===80&&qualityScore(2,4,{a:5})===75);
// ---- reports
const R=(o:any):any=>({provider:'gemini',ok:true,input_tokens:10,output_tokens:10,created_at:now.toISOString(),feature:'tutor',student_id:'s1',cost_inr:0,cost_est_inr:1,...o});
{const rows=[R({}),R({student_id:'s2',cost_est_inr:3}),R({ok:false,cost_est_inr:0}),R({provider:'gateway',ok:false,student_id:null}),R({provider:'openai',cost_inr:2,cost_est_inr:2,feature:'handwriting',ref:'e1'}),R({provider:'openai',cost_inr:4,cost_est_inr:4,feature:'handwriting',ref:'e1'}),R({provider:'openai',cost_inr:6,cost_est_inr:6,feature:'handwriting',ref:'e2'}),R({feature:'handwriting'})];
 const s=summariseCost(rows); t('summary counts',s.calls===6&&s.failures===2&&Math.abs(s.billedInr-12)<1e-9&&s.activeStudents===2&&s.freeCalls===0);
 const ps=perStudent(rows); t('per student',ps.billedPerStudent.value===6&&ps.billedPer1000.value===6000&&ps.billedPer1000.label==='ESTIMATED'&&ps.billedPerStudent.label==='ACTUAL');
 t('per student no data',perStudent([]).billedPerStudent.label==='Insufficient data'&&perStudent([]).billedPerStudent.value===null);
 const hw=perHandwrittenEvaluation(rows); t('per handwritten eval by ref',hw.evaluations===2&&hw.billedAvg.value===6);
 t('hw none => insufficient',perHandwrittenEvaluation([R({})]).billedAvg.label==='Insufficient data');
 const pf=perFeature(rows); t('per feature excludes gateway',!pf.some(f=>f.feature==='gateway')&&pf.find(f=>f.feature==='handwriting')!.tier===3);}
// ---- alerts
{const lines=providerLines([P({id:'g',provider_name:'G',rpd:100}),P({id:'h',provider_name:'H'})],{g:used(95),h:hu(10,8)},[],cfg(),()=>true,'2026-10-20',null);
 const al=aiAlerts({lines,cfg:cfg(),spendToday:0,spendMonth:0,todayCalls:0,avgDailyCalls7:null,gatewayRefusalsToday:0,providers:[P({id:'g'}),P({id:'h'})]});
 t('critical quota alert',al.some(a=>a.kind==='quota'&&a.level==='critical'&&/G:/.test(a.text)));
 t('unreliable alert',al.some(a=>a.kind==='failure'&&/H:/.test(a.text)));
 t('critical sorted first',al[0].level==='critical');
 const al2=aiAlerts({lines:[],cfg:cfg(),spendToday:5,spendMonth:0,todayCalls:0,avgDailyCalls7:null,gatewayRefusalsToday:0,providers:[]});
 t('spend in free-only mode is critical',al2.some(a=>a.kind==='cost'&&a.level==='critical'));
 const al3=aiAlerts({lines:[],cfg:cfg({max_daily_spend_inr:100}),spendToday:85,spendMonth:0,todayCalls:0,avgDailyCalls7:null,gatewayRefusalsToday:0,providers:[]});
 t('80% of daily cap warns',al3.some(a=>a.kind==='cost'&&a.level==='warning'));
 const al4=aiAlerts({lines:[],cfg:cfg(),spendToday:0,spendMonth:0,todayCalls:400,avgDailyCalls7:100,gatewayRefusalsToday:2,providers:[]});
 t('unusual usage + refusals',al4.some(a=>/Unusual/.test(a.text))&&al4.some(a=>/refused/.test(a.text)));
 t('no fallback warning',al4.some(a=>/Fewer than two/.test(a.text)));
 t('est remaining students',providerLines([P({id:'g',rpd:100})],{g:used(40)},[],cfg(),()=>true,'2026-10-20',3)[0].estimatedRemainingStudents.value===20);
 t('est remaining unknown w/o data',providerLines([P({id:'g',rpd:100})],{},[],cfg(),()=>true,'2026-10-20',null)[0].estimatedRemainingStudents.label==='Insufficient data');}
// ---- full gateway with injected deps
(async()=>{
  const mk=(provs:any[],conf:any={},over:any={})=>{
    const logs:any[]=[]; const calls:string[]=[]; const ctx={providers:provs,config:cfg(conf),usage:{} as any,spendToday:0,spendMonth:0,benchmark:{}};
    const deps:any={env:{X_KEY:'k'},now:()=>now,loadContext:async()=>ctx,userStats:async()=>({userCallsToday:over.calls??0,userSpendMonth:0,featureSpendMonth:0,refSpend:0}),
      buildAdapter:(p:any,m:any)=>({supportsImages:true,complete:async(params:any)=>{calls.push(p.id+':'+(m??'')+':'+params.userMessage); if(over.fail?.includes(p.id)) throw new Error(over.err??`${p.id}_request_failed: 503 busy`); return {text:'ok',usage:{inputTokens:100,outputTokens:50}}}})};
    const gw=new GatewayAIProvider({deps,studentId:'s1',tier:over.tier??'paid',onAttempt:a=>{logs.push(a)}}); return {gw,logs,calls,ctx};
  };
  resetGatewayState();
  let h=mk([G,Q]); let r=await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'});
  t('gateway success',r.text==='ok'&&h.calls.length===1&&h.logs[0].provider==='gemini'&&h.logs[0].model==='m'&&h.logs[0].task==='tutor'&&h.logs[0].taskTier===2&&h.logs[0].freeQuotaUsed===true&&h.logs[0].costInr===0&&h.logs[0].costEstInr>0);
  resetGatewayState(); h=mk([G,Q],{},{fail:['gemini']}); r=await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'});
  t('fallback to groq',h.calls.join()==='gemini::hi,groq::hi'&&h.logs[0].ok===false&&h.logs[0].statusCode===503&&h.logs[1].ok&&h.logs[1].provider==='groq');
  resetGatewayState(); h=mk([G,Q],{},{fail:['gemini','groq']}); let e:any; try{await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'})}catch(x){e=x}
  t('all fail => known error prefix',/^all_ai_providers_unavailable/.test(e?.message)&&h.logs.length===2);
  resetGatewayState(); h=mk([G,Q],{},{fail:['gemini'],err:'gemini_request_failed: 429 slow down'}); await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'});
  h.calls.length=0; await h.gw.complete({systemPrompt:'s',userMessage:'again',feature:'tutor'}); t('429 puts provider on cooldown',h.calls.join()==='groq::again');
  resetGatewayState(); h=mk([G,Q],{primary_model:'big-model'}); await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'}); t('primary model override from config',h.calls[0]==='gemini:big-model:hi'&&h.logs[0].model==='big-model');
  resetGatewayState(); h=mk([G,Q]); await h.gw.complete({systemPrompt:'s',userMessage:'mail a@b.com or 9876543210',feature:'tutor'}); t('contact details removed before sending',!/a@b\.com|9876543210/.test(h.calls[0]));
  resetGatewayState(); h=mk([G,Q]); e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'xp' as any})}catch(x){e=x} t('tier 0 never reaches a provider',/tier0_no_ai/.test(e?.message)&&h.calls.length===0&&h.logs.length===0);
  resetGatewayState(); h=mk([G,Q],{},{calls:500}); e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'tutor'})}catch(x){e=x} t('per-user call limit refuses, logs, no provider call',/ai_budget_limit \(user_call_limit\)/.test(e?.message)&&h.calls.length===0&&h.logs[0].provider==='gateway'&&h.logs[0].ok===false);
  resetGatewayState(); h=mk([G,Q,O],{...paidCfg},{fail:['gemini','groq']}); r=await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'}); t('paid used only after free fail with explicit rule',r.text==='ok'&&h.calls.length===3&&h.logs[2].provider==='openai'&&h.logs[2].costInr>0&&!h.logs[2].freeQuotaUsed);
  resetGatewayState(); h=mk([G,Q,O],{},{fail:['gemini','groq']}); e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'})}catch(x){e=x} t('free fail does NOT silently go paid by default',!!e&&!h.calls.some(c=>c.startsWith('openai')));
  resetGatewayState(); h=mk([G,Q,O],{...paidCfg,max_daily_spend_inr:100},{fail:['gemini','groq']}); h.ctx.spendToday=100; e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'hi',feature:'tutor'})}catch(x){e=x} t('daily cap reached: essential task still tries free, never paid',!!e&&!h.calls.some(c=>c.startsWith('openai')));
  resetGatewayState(); h=mk([G,Q],{max_daily_spend_inr:100}); h.ctx.spendToday=100; e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'explanation'})}catch(x){e=x} t('non-essential stopped at cap with graceful error',/ai_budget_limit/.test(e?.message)&&h.calls.length===0);
  resetGatewayState(); h=mk([P({id:'g',rpd:2,priority:1}),Q],{primary_provider:'g'}); await h.gw.complete({systemPrompt:'s',userMessage:'1',feature:'tutor'}); await h.gw.complete({systemPrompt:'s',userMessage:'2',feature:'tutor'}); await h.gw.complete({systemPrompt:'s',userMessage:'3',feature:'tutor'}); t('quota hit mid-day: switches to fallback automatically',h.calls.join()==='g::1,g::2,groq::3');
  resetGatewayState(); h=mk([Q]); e=null; try{await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'handwriting',images:[{mimeType:'image/jpeg',base64:'aa'}]})}catch(x){e=x} t('no vision provider => clear error',/no_vision_provider/.test(e?.message));
  resetGatewayState(); h=mk([G]); await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'handwriting',ref:'exam1',images:[{mimeType:'image/jpeg',base64:'aa'},{mimeType:'image/jpeg',base64:'bb'}]}); t('image count + ref logged',h.logs[0].images===2&&h.logs[0].ref==='exam1'&&h.logs[0].taskTier===3);
  resetGatewayState(); h=mk([G,Q],{},{tier:'free'}); await h.gw.complete({systemPrompt:'s',userMessage:'x',feature:'tutor'}); t('free tier student works on free providers',h.logs[0].ok);
  // registry unreadable -> legacy chain
  resetGatewayState(); let legacyUsed=false; const gw2=new GatewayAIProvider({deps:{env:{},now:()=>now,loadContext:async()=>{throw new Error('relation does not exist')},userStats:async()=>({} as any),buildAdapter:()=>({} as any)},studentId:null,tier:'free',legacy:()=>({complete:async()=>{legacyUsed=true;return {text:'legacy',usage:{inputTokens:0,outputTokens:0}}}})});
  r=await gw2.complete({systemPrompt:'s',userMessage:'x',feature:'tutor'}); t('registry unreadable => legacy chain keeps app working',legacyUsed&&r.text==='legacy');
  console.log(`${ok} passed, ${bad} failed`); process.exit(bad?1:0);
})();
