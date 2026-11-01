import { aiTierForPlan, tutorRepliesPerDay, planAllows, PLANS, validateAccessUntil, defaultAccessUntil, FREE_TUTOR_REPLIES_PER_DAY, PAID_TUTOR_REPLIES_PER_DAY } from '../packages/core/plans/plans';
import { startOfTodayIst, listPriceInr, billedInr, buildUsageReport, monthRangeIst, freeProviderNames, assertTutorAllowance } from '../packages/core/ai-provider/usage';
import { FallbackAIProvider } from '../packages/core/ai-provider/fallback.provider';
import { createAIProvider } from '../packages/core/ai-provider/factory';
let fails=0;
const ck=(n:string,ok:boolean)=>{ if(!ok) fails++; console.log(ok?'PASS':'FAIL',n); };
ck('prices', PLANS.per_subject_monthly.priceInr===1000 && PLANS.five_monthly.priceInr===3300 && PLANS.five_till_march.priceInr===15000);
ck('tier free', aiTierForPlan('free')==='free' && aiTierForPlan(null)==='free' && aiTierForPlan(undefined)==='free');
ck('tier paid', ['per_subject_monthly','five_monthly','five_till_march','grandfathered','custom'].every(p=>aiTierForPlan(p)==='paid'));
ck('caps', tutorRepliesPerDay('free')===FREE_TUTOR_REPLIES_PER_DAY && tutorRepliesPerDay('five_monthly')===PAID_TUTOR_REPLIES_PER_DAY && FREE_TUTOR_REPLIES_PER_DAY<PAID_TUTOR_REPLIES_PER_DAY);
ck('mock gate', !planAllows('free','mock_exams') && planAllows('five_monthly','mock_exams') && planAllows('grandfathered','mock_exams'));
ck('free no date needed', validateAccessUntil('free',null)===null && defaultAccessUntil('free')===null);
ck('paid rules kept', validateAccessUntil('five_monthly','2027-03-01')==='date_after_plan_end' && validateAccessUntil('per_subject_monthly',null)==='date_required');
// IST day start: 2026-10-16 02:00 IST = 2026-10-15 20:30Z -> day start 2026-10-15T18:30Z
ck('ist start early', startOfTodayIst(new Date('2026-10-15T20:30:00Z'))==='2026-10-15T18:30:00.000Z');
ck('ist start late', startOfTodayIst(new Date('2026-10-16T17:00:00Z'))==='2026-10-15T18:30:00.000Z');
ck('ist rollover', startOfTodayIst(new Date('2026-10-16T18:30:00Z'))==='2026-10-16T18:30:00.000Z');
// cost: claude 1M in + 1M out = $6 = Rs 528
ck('list price', Math.abs(listPriceInr('claude',1_000_000,1_000_000)-528)<0.01);
ck('unknown provider 0', listPriceInr('nope',1000,1000)===0);
ck('free billed 0', billedInr('gemini',1e6,1e6,['gemini'])===0 && billedInr('claude',1e6,1e6,['gemini'])>0);
const rows:any[]=[
 {student_id:'a',tier:'free',provider:'gemini',feature:'tutor',ok:true,input_tokens:1000,output_tokens:200,created_at:''},
 {student_id:'a',tier:'free',provider:'gemini',feature:'tutor',ok:false,input_tokens:0,output_tokens:0,created_at:''},
 {student_id:'b',tier:'paid',provider:'claude',feature:'summary',ok:true,input_tokens:2000,output_tokens:300,created_at:''},
];
const rep=buildUsageReport(rows,['gemini']);
ck('report totals', rep.total.calls===2 && rep.total.failures===1 && rep.total.inputTokens===3000);
ck('report by student', rep.byStudent.a.calls===1 && rep.byStudent.b.calls===1 && rep.byTier.paid.billedInr>0 && rep.byTier.free.billedInr===0);
const mr=monthRangeIst('2026-10')!;
ck('month range', mr.from==='2026-09-30T18:30:00.000Z' && mr.to==='2026-10-31T18:30:00.000Z' && monthRangeIst('2026-13')===null && monthRangeIst('x')===null);
ck('free providers default', freeProviderNames().join()==='gemini,gemini_2,groq');
(async()=>{
  const seen:any[]=[];
  const ok={complete:async()=>({text:'hi',usage:{inputTokens:5,outputTokens:7}})};
  const bad={complete:async()=>{throw new Error('boom')}};
  const p=new FallbackAIProvider([{name:'a',provider:bad},{name:'b',provider:ok}],(x)=>{seen.push(x)});
  const r=await p.complete({systemPrompt:'s',userMessage:'u',feature:'tutor'});
  ck('fallback result', r.text==='hi');
  ck('attempts logged', seen.length===2 && seen[0].ok===false && seen[0].provider==='a' && seen[0].error==='boom' && seen[1].ok===true && seen[1].inputTokens===5 && seen[1].feature==='tutor');
  const thrower=new FallbackAIProvider([{name:'a',provider:ok}],()=>{throw new Error('log down')});
  ck('log failure harmless', (await thrower.complete({systemPrompt:'s',userMessage:'u'})).text==='hi');
  process.env.GEMINI_API_KEY='x'; process.env.GROQ_API_KEY='y'; process.env.OPENAI_API_KEY='z'; process.env.ANTHROPIC_API_KEY='w';
  const names=(t:any)=>((createAIProvider({tier:t}) as any).chain as any[]).map(c=>c.name).join();
  ck('free chain no paid', names('free')==='gemini,groq');
  ck('paid chain full', names('paid')==='gemini,groq,openai,claude' && names(undefined)==='gemini,groq,openai,claude');
  process.env.AI_FREE_PROVIDERS='groq';
  ck('env overrides free list', names('free')==='groq');
  // allowance with a fake service client
  const fake=(n:number)=>({from:()=>{const q:any={select:()=>q,eq:()=>q,gte:()=>Promise.resolve({count:n})};return q;}}) as any;
  let threw='';
  try{ await assertTutorAllowance(fake(10),'s',10);}catch(e:any){threw=e.message}
  ck('allowance at limit throws', threw==='daily_ai_limit');
  threw='';
  try{ await assertTutorAllowance(fake(9),'s',10);}catch(e:any){threw=e.message}
  ck('allowance under limit ok', threw==='');
  console.log(fails?`${fails} FAILED`:'ALL PASSED');
})();
