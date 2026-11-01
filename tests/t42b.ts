import { summariseQuestions, difficultyMismatch, observedDifficultyFromPercent } from '../packages/core/question-intelligence/stats';
import { computeEconomics, toCsv, monthRangeUtcIst } from '../packages/core/metrics/funnel';
import { foundingSeatsLeft, FOUNDING_FAMILY, PLANS, validateAccessUntil, defaultAccessUntil } from '../packages/core/plans/plans';
let ok=0,bad=0; const eq=(n:string,a:any,b:any)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++}else{bad++;console.log('BAD',n,a,b)} };
const mk=(id:string,n:number,c:number,hint=0)=>Array.from({length:n},(_,i)=>({questionId:id,correct:i<c,hintsUsed:i<hint?1:0,seconds:60}));
const st=summariseQuestions([...mk('a',30,3,15),...mk('b',10,10),...mk('c',25,22)]);
eq('few',st.get('b')!.enough,false); eq('few pct',st.get('b')!.percentCorrect,null);
eq('a pct',st.get('a')!.percentCorrect,10); eq('a obs',st.get('a')!.observedDifficulty,5); eq('a hints',st.get('a')!.hintPercent,50); eq('a time',st.get('a')!.avgSeconds,60);
eq('mismatch harder',difficultyMismatch(2,st.get('a')!),'harder_than_written');
eq('no judge',difficultyMismatch(1,st.get('b')!),null);
eq('c easier',difficultyMismatch(4,st.get('c')!),'easier_than_written'); eq('c close',difficultyMismatch(2,st.get('c')!),null);
eq('obs',[80,79,60,40,20,19].map(observedDifficultyFromPercent),[1,2,2,3,4,5]);
// economics
const e=computeEconomics({month:'2026-11',revenueInr:10000,paidStudents:2,aiCostListInr:500,aiCostBilledInr:0,teacherReviews:10,teacherRateInr:100});
eq('contrib',e.contributionInr,8500); eq('margin',e.grossMarginPercent,85); eq('per',e.perPaidStudent,{revenue:5000,aiList:250,teacher:500,contribution:4250});
const z=computeEconomics({month:'2026-11',revenueInr:0,paidStudents:0,aiCostListInr:50,aiCostBilledInr:0,teacherReviews:0,teacherRateInr:0});
eq('no revenue',[z.grossMarginPercent,z.contributionInr,z.perPaidStudent],[null,null,null]);
// csv
eq('csv',toCsv(['a','b'],[['x,y',1],['=SUM(A1)',null],['say "hi"',2]]),'a,b\n"x,y",1\n\'=SUM(A1),\n"say ""hi""",2\n');
eq('month',monthRangeUtcIst('2026-11'),{from:'2026-10-31T18:30:00.000Z',to:'2026-11-30T18:30:00.000Z'}); eq('badmonth',monthRangeUtcIst('2026-13'),null);
// plans
eq('seats',[foundingSeatsLeft(0),foundingSeatsLeft(49),foundingSeatsLeft(60)],[50,1,0]); eq('cap',FOUNDING_FAMILY.seatCap,50);
eq('price',PLANS.founding_family.priceInr,4999); eq('late date',validateAccessUntil('founding_family','2027-04-01'),'date_after_plan_end');
eq('ok date',validateAccessUntil('founding_family','2027-03-31'),null); eq('default',defaultAccessUntil('founding_family'),'2027-03-31');
console.log(ok,'ok',bad,'bad');
