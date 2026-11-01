import { describeSubject, buildHeadline, buildChangeReport } from '../packages/core/reports/change-report.service';
import { summariseInterventions } from '../packages/core/metrics/founder-metrics';
let fails=0; const ck=(n:string,ok:boolean,x?:any)=>{ if(!ok){fails++;console.log('FAIL',n,x??'')} else console.log('PASS',n)};
const base:any={subjectName:'Maths',answers:30,prevAnswers:25,accuracyPercent:70,prevAccuracyPercent:55,hintRatePercent:20,prevHintRatePercent:40,mockPercent:68,prevMockPercent:60};
let s=describeSubject(base);
ck('improved wording',s[0].includes('more accurate')&&s.some(x=>x.includes('Fewer answers needed hints'))&&s.some(x=>x.includes('+8 points')),s);
s=describeSubject({...base,accuracyPercent:50});
ck('dip wording',s[0].includes('dipped'),s);
s=describeSubject({...base,accuracyPercent:57});
ck('flat wording',s[0].includes('about as accurate'),s);
s=describeSubject({...base,prevAnswers:4});
ck('refuses thin comparison',s[0].includes('Not enough answers')&&!s[0].includes('more accurate'),s);
s=describeSubject({...base,answers:0,mockPercent:null,prevMockPercent:null});
ck('idle',s[0].includes('No practice in the last 30 days'),s);
s=describeSubject({...base,mockPrev:0,prevMockPercent:null});
ck('mock without prior',s.some(x=>x.includes('none in the 30 days before')),s);
const all=[...describeSubject(base),...describeSubject({...base,accuracyPercent:50})].join(' ').toLowerCase();
ck('no labelling words',!/lazy|weak student|careless|anxious|failing/.test(all));
let h=buildHeadline([],0,0); ck('empty headline',!h.enough&&h.headline[0].includes('No learning sessions'));
h=buildHeadline([{...base,statements:[]},{...base,subjectName:'Sci',accuracyPercent:40,statements:[]}],6,9);
ck('headline up/down + fewer sessions', h.headline.some(x=>x.includes('More accurate answers in Maths'))&&h.headline.some(x=>x.includes('dipped in Sci'))&&h.whatNext.some(x=>x.includes('fewer')),h);
// interventions
const iv=summariseInterventions([
 ...Array.from({length:6},(_,i)=>({id:'a'+i,delta:10,strategies:['HINT','EXPLAIN'],gentler:false})),
 ...Array.from({length:2},(_,i)=>({id:'b'+i,delta:-5,strategies:['HINT'],gentler:true}))]);
const hint=iv.find(x=>x.strategy==='HINT')!, ex=iv.find(x=>x.strategy==='EXPLAIN')!, g=iv.find(x=>x.strategy==='gentler_pace')!;
ck('interventions averages',hint.sessions===8&&hint.avgMasteryChange===6.3&&ex.avgMasteryChange===10,iv);
ck('interventions hide small n',g.sessions===2&&g.avgMasteryChange===null&&!g.enough);
// full builder with fake client
const now=new Date('2026-10-17T00:00:00Z'); const dago=(d:number)=>new Date(now.getTime()-d*86400000).toISOString();
const att=(d:number,ok:boolean,hint=0)=>({is_correct:ok,hints_used:hint,created_at:dago(d),questions:{skills:{topics:{chapters:{subject_id:'M',subjects:{name:'Maths'}}}}}});
const attempts=[...Array.from({length:12},(_,i)=>att(5+i,i<9)),...Array.from({length:12},(_,i)=>att(35+i,i<5,1))];
const fake:any={from:(t:string)=>{const q:any={select:()=>q,eq:()=>q,gte:()=>q,limit:()=>q,then:(r:any)=>Promise.resolve({data:t==='question_attempts'?attempts:t==='learning_sessions'?[{started_at:dago(2)},{started_at:dago(9)},{started_at:dago(40)}]:t==='mock_exams'?[{subject_id:'M',kind:'full_mock',score:15,total:20,submitted_at:dago(3),subjects:{name:'Maths'}},{subject_id:'M',kind:'chapter_check',score:1,total:8,submitted_at:dago(4),subjects:{name:'Maths'}}]:[],error:null}).then(r)};return q}};
(async()=>{
 const r=await buildChangeReport(fake,'x',now);
 const m=r.subjects[0];
 ck('builder windows', r.sessions===2&&r.prevSessions===1&&m.answers===12&&m.prevAnswers===12, r);
 ck('builder accuracy 75 vs 42', m.accuracyPercent===75&&m.prevAccuracyPercent===42,m);
 ck('builder hints 0 vs 100', m.hintRatePercent===0&&m.prevHintRatePercent===100);
 ck('chapter check excluded from mocks', m.mockPercent===75&&m.prevMockPercent===null,m.mockPercent);
 ck('builder says more accurate', m.statements[0].includes('more accurate')&&r.enoughToCompare);
 console.log(fails?`${fails} FAILED`:'ALL PASSED'); process.exit(fails?1:0);
})();
