import { fakeSupabase } from './fakedb';
import { startDiagnostic, requestBankGrowth, runBankGrowth } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
let calls=0;
// AI: generator returns a new question each time; solver agrees unless prompt contains "BAD"
const ai:any={complete:async(r:any)=>{
  if(r.systemPrompt.includes('solving')){ calls++; const bad=r.userMessage.includes('BAD'); return {text:JSON.stringify({answer:bad?'999':'42'})}; }
  const n=Math.random().toString(36).slice(2); const bad=Math.random()<0.25;
  return {text:JSON.stringify({prompt:`Generated ${bad?'BAD ':''}question ${n} what is 6 x 7?`,questionType:'numeric',options:null,expectedAnswer:{value:'42'},explanation:'6 times 7 is 42 so answer 42.'})};}};
(async()=>{ try {
  const tables:any={
    diagnostic_tests:[{id:'T',subject_id:'S',is_active:true}],
    chapters:[{id:'c1',subject_id:'S',sequence:1,topics:[{id:'t1',sequence:1,skills:[{id:'k1',name:'Skill1',retired:false}]}]}],
    skills:[{id:'k1',name:'Skill1'}], subjects:[{id:'S',name:'Mathematics'}],
    diagnostic_attempts:[{id:'A0',student_id:'st',status:'completed'}],
    diagnostic_questions:[
      {id:'q1',diagnostic_test_id:'T',skill_id:'k1',difficulty:3,prompt:'p1',content_status:'approved'},
      {id:'q2',diagnostic_test_id:'T',skill_id:'k1',difficulty:3,prompt:'p2',content_status:'approved'}],
    diagnostic_answers:[{diagnostic_attempt_id:'A0',diagnostic_question_id:'q1',responded_at:'2026-10-01T00:00:00Z'}],
    questions:[], question_bank_growth:[]};
  const sb:any=fakeSupabase(tables);
  // 1: q1 was seen -> must get q2 every time (20 tries, fresh attempts)
  for(let i=0;i<20;i++){ tables.diagnostic_attempts=tables.diagnostic_attempts.filter((a:any)=>a.id==='A0'); const r=await startDiagnostic(sb,'st','S',ai); t('unseen q2 served',r.firstQuestion.id==='q2'); tables.diagnostic_questions=tables.diagnostic_questions.filter((q:any)=>['q1','q2'].includes(q.id)); }
  // 2: both seen -> a new generated question
  tables.diagnostic_answers.push({diagnostic_attempt_id:'A0',diagnostic_question_id:'q2',responded_at:'2026-10-02T00:00:00Z'});
  tables.diagnostic_attempts=tables.diagnostic_attempts.filter((a:any)=>a.id==='A0');
  const r2=await startDiagnostic(sb,'st','S',ai); t('plan has a fixed 20 questions (v60)', (tables.diagnostic_attempts.find((a:any)=>a.id!=='A0')?.result.plan.length)===20); t('generated when all seen',!['q1','q2'].includes(r2.firstQuestion.id));
  // 3: AI down + all seen -> least recently seen (q1)
  const dead:any={complete:async()=>{throw new Error('down')}};
  tables.diagnostic_questions=tables.diagnostic_questions.filter((q:any)=>['q1','q2'].includes(q.id));
  tables.diagnostic_attempts=tables.diagnostic_attempts.filter((a:any)=>a.id==='A0');
  const r3=await startDiagnostic(sb,'st','S',dead); t('fallback least recent = q1',r3.firstQuestion.id==='q1');
  // 4: growth
  await requestBankGrowth(sb,'S',50);
  const g=await runBankGrowth(sb,ai,'S',20000);
  t('made 50',g.made===50&&g.stillOwed===0);
  const ps=[...tables.questions,...tables.diagnostic_questions.filter((q:any)=>q.source==='generated')].map((q:any)=>q.prompt);
  t('no BAD saved',!ps.some((p:string)=>p.includes('BAD')));
  t('all needs_review',tables.questions.every((q:any)=>q.content_status==='needs_review'));
  t('both banks grew',tables.questions.length>20&&tables.diagnostic_questions.filter((q:any)=>q.source==='generated').length>10);
  t('ledger',tables.question_bank_growth[0].produced_total===50&&tables.question_bank_growth[0].locked_until===null);
  const g2=await runBankGrowth(sb,ai,'S',1000); t('nothing owed skip',g2.skipped==='nothing_owed');
  await requestBankGrowth(sb,'S',50); tables.question_bank_growth[0].locked_until=new Date(Date.now()+60000).toISOString();
  t('locked skip',(await runBankGrowth(sb,ai,'S',1000)).skipped==='locked');
  tables.question_bank_growth[0].locked_until=null;
  const g3=await runBankGrowth(sb,dead,'S',5000); t('ai down stops, keeps owed',g3.made===0&&g3.stillOwed===50);
  console.log('ok',ok,'bad',bad);
} catch(e:any){ console.log("ERR",e?.message??JSON.stringify(e)) } })();
