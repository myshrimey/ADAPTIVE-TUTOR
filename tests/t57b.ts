const M='00000000-0000-0000-0000-0000000000aa';
import * as C from '../packages/core/index';
import { fakeDb } from './fakedb2';
let ok=0,bad=0; const t=(n:string,c:any)=>{c?ok++:(bad++,console.log('FAIL',n))};
const iso=(offDays=0)=>new Date(Date.now()-offDays*86400000).toISOString();
const sk=(skillId:string,name:string,chapterId:string,chapterName:string,subjectId:string,subjectName:string)=>[skillId,{skillId,name,chapterId,chapterName,subjectId,subjectName}] as [string,C.SkillInfo];
const idx=new Map<string,C.SkillInfo>([sk('s1','Linear equations','ch1','Algebra',M,'Maths'),sk('s2','Quadratics','ch1','Algebra',M,'Maths'),sk('s3','Reflection','ch2','Light','sc','Science'),sk('s4','Tiny','ch3','Tiny chapter','xx','Tiny subject')]);
const dq=(id:string,skill:string,test:string,d:number,status='verified')=>({id,skill_id:skill,diagnostic_test_id:test,difficulty:d,question_type:'numeric',prompt:'Q '+id,options:null,expected_answer:{value:'A'},explanation:'Because '+id,content_status:status,validated:true,marks:1+(d%3),cognitive_level:d===5?'application':'recall',figure_url:null,figure_caption:null});
const tables:any={
 curricula:[{id:'cur',board:'CBSE',class:'10'}],
 subjects:[{id:M,curriculum_id:'cur',name:'Maths',slug:'maths',status:'ready'},{id:'sc',curriculum_id:'cur',name:'Science',slug:'science',status:'ready'},{id:'xx',curriculum_id:'cur',name:'Tiny subject',slug:'tiny',status:'ready'}],
 learning_goals:[{student_id:'st1',subject_id:M,status:'active',activated_at:iso(5),created_at:iso(5)},{student_id:'st1',subject_id:'sc',status:'active',activated_at:iso(4),created_at:iso(4)},{student_id:'st1',subject_id:'xx',status:'active',activated_at:iso(4),created_at:iso(4)}],
 students:[{id:'st1',display_name:'Arvind Tiwari',grade:'10'},{id:'st2',display_name:'Meera Sharma',grade:'10'},{id:'st3',display_name:'Ravi Kumar',grade:'10'},{id:'st4',display_name:'Zed Outsider',grade:'10'}].map(s=>({...s,created_at:iso(10)})),
 diagnostic_tests:[{id:'dtm',subject_id:M,is_active:true},{id:'dts',subject_id:'sc',is_active:true},{id:'dtx',subject_id:'xx',is_active:true}],
 diagnostic_questions:[...Array(30)].map((_,i)=>dq('mq'+i,i%2?'s1':'s2','dtm',1+(i%5))).concat([...Array(12)].map((_,i)=>dq('sq'+i,'s3','dts',1+(i%5)))).concat([...Array(5)].map((_,i)=>dq('xq'+i,'s4','dtx',1+i))),
 questions:[{id:'lq1',skill_id:'s1',expected_answer:{value:'7'}},{id:'lq2',skill_id:'s1',expected_answer:{value:'8'}},{id:'lq3',skill_id:'s1',expected_answer:{value:'9'}},{id:'lq4',skill_id:'s1',expected_answer:{value:'10'}}],
 misconceptions:[{id:'mc1',tag:'CONCEPT_CONFUSION'}],
 achievements:[], student_links:[],
};
// seed achievements from the migration
import { readFileSync } from 'fs';
const sql=readFileSync('packages/db/migrations/0034_engagement.sql','utf8');
for(const m of sql.matchAll(/\('([a-z0-9_]+)','([a-z]+)','([^']+)','([^']+)','([a-z_]+)',(\d+),(\d+),(\d+)\)/g)) tables.achievements.push({code:m[1],category:m[2],title:m[3],description:m[4],metric:m[5],threshold:Number(m[6]),xp:Number(m[7]),sort:Number(m[8]),active:true});
const dtRel={diagnostic_tests:{table:'diagnostic_tests',fk:'diagnostic_test_id'}};
const defs:any={}; for(const blk of sql.matchAll(/create table if not exists (\w+) \(([\s\S]*?)\n\);/g)){ const d:any={}; for(const ln of blk[2].split('\n')){ const m=ln.match(/^\s*(\w+) [a-z]+(?:\(\d+\))? .*?default (.+?)(?:,| check|$)/); if(!m||m[1]==='id')continue; let v=m[2].trim(); if(/^now\(\)/.test(v)||/now\(\) \+/.test(v)) d[m[1]]=()=>new Date().toISOString(); else if(/^-?\d+$/.test(v)) d[m[1]]=Number(v); else if(v==='true'||v==='false') d[m[1]]=v==='true'; else if(/^'\[\]'/.test(v)) d[m[1]]=[]; else if(/^'\{\}'/.test(v)) d[m[1]]={}; else if(/^'.*'$/.test(v.replace(/::.*$/,''))) d[m[1]]=v.replace(/::.*$/,'').slice(1,-1); } defs[blk[1]]=d; }
const db=fakeDb(tables,{defaults:defs,rels:{subjects:{curricula:{table:'curricula',fk:'curriculum_id'}},diagnostic_questions:dtRel,diagnostic_attempts:dtRel,question_attempts:{questions:{table:'questions',fk:'question_id'}},leaderboard_entries:{leaderboards:{table:'leaderboards',fk:'leaderboard_id'}}},
 unique:{xp_transactions:[['student_id','ref']],mistake_book:[['student_id','question_table','question_id']],student_achievements:[['student_id','code']],daily_missions:[['student_id','day']],personal_bests:[['student_id','kind','scope_id']],student_engagement:[['student_id']],challenge_attempts:[['student_id','ref']],leaderboard_entries:[['leaderboard_id','student_id']]}});
const ctx:any={idx,settings:C.mergeEngagement({})};
const xpSum=(sid='st1')=>tables.xp_transactions?.filter((x:any)=>x.student_id===sid).reduce((n:number,x:any)=>n+x.amount,0)??0;
const refs=(sid='st1')=>(tables.xp_transactions??[]).filter((x:any)=>x.student_id===sid).map((x:any)=>x.ref);
const eng=()=>tables.student_engagement.find((r:any)=>r.student_id==='st1');
(async()=>{ try {
// ===== S1: new student =====
let a=await C.afterActivity(db,'st1',ctx);
t('new: streak 0', a.streak.current===0&&a.streak.state==='new'); t('new: no xp', xpSum()===0&&!tables.xp_transactions?.length);
t('new: mission = diagnostic + daily', a.mission!.items.map((i:any)=>i.kind).join()==='diagnostic,daily'&&a.mission!.title==='Your first steps');
const mid=a.mission!.id; a=await C.afterActivity(db,'st1',ctx); t('mission stable on repeat', a.mission!.id===mid&&tables.daily_missions.length===1&&tables.mission_items.length===2);
// ===== S2: lesson session + wrong answers =====
tables.learning_sessions=[{id:'ls1',student_id:'st1',skill_id:'s1',status:'completed',started_at:iso(0),completed_at:iso(0)}];
tables.question_attempts=[{id:'a1',student_id:'st1',question_id:'lq1',session_id:'ls1',answer:{value:'7'},is_correct:true,created_at:iso(0)},{id:'a2',student_id:'st1',question_id:'lq2',session_id:'ls1',answer:{value:'8'},is_correct:true,created_at:iso(0)},{id:'a3',student_id:'st1',question_id:'lq3',session_id:'ls1',answer:{value:'1'},is_correct:false,detected_misconception_id:'mc1',created_at:iso(0)},{id:'a4',student_id:'st1',question_id:'lq4',session_id:'ls1',answer:{value:'2'},is_correct:false,detected_misconception_id:null,created_at:iso(0)}];
await C.afterActivity(db,'st1',ctx);
t('lesson xp 10+2', refs().includes('ls:ls1')&&tables.xp_transactions.find((x:any)=>x.ref==='ls:ls1').amount===12);
const mb=tables.mistake_book.filter((m:any)=>m.student_id==='st1'); t('2 lesson mistakes', mb.length===2);
t('category from detected tag only', mb.find((m:any)=>m.question_id==='lq3').error_category==='concept'&&mb.find((m:any)=>m.question_id==='lq4').error_category===null);
t('mistake fields', mb[0].student_answer!==undefined&&mb[0].correct_answer&&mb[0].repetitions===1&&mb[0].status==='open'&&mb[0].subject_id===M&&mb[0].chapter_id==='ch1'&&mb[0].skill_id==='s1');
const before=xpSum(); eng().sync_cursor=null; await C.afterActivity(db,'st1',ctx);
t('re-sync from scratch: no double xp', xpSum()===before); t('re-sync: no double mistakes', tables.mistake_book.filter((m:any)=>m.student_id==='st1').every((m:any)=>m.repetitions===1));
t('streak 1', eng().current_streak===1);
// ===== S3: diagnostic =====
tables.diagnostic_attempts=[{id:'da1',student_id:'st1',diagnostic_test_id:'dtm',status:'completed',started_at:iso(0),completed_at:iso(0)}];
tables.diagnostic_answers=[{id:'x1',diagnostic_attempt_id:'da1',diagnostic_question_id:'mq3',answer:{value:'Z'},is_correct:false},{id:'x2',diagnostic_attempt_id:'da1',diagnostic_question_id:'mq4',answer:{value:'A'},is_correct:true}];
a=await C.afterActivity(db,'st1',ctx);
t('diagnostic xp 30', refs().includes('da:da1')&&tables.xp_transactions.find((x:any)=>x.ref==='da:da1').amount===30);
t('diagnostic wrong -> mistake book', tables.mistake_book.some((m:any)=>m.question_id==='mq3'&&m.source==='diagnostic')&&!tables.mistake_book.some((m:any)=>m.question_id==='mq4'));
const got=tables.student_achievements.filter((x:any)=>x.student_id==='st1').map((x:any)=>x.code);
t('achievements first diagnostic/lesson/subject checkpoint', ['first_diagnostic','first_lesson','subject_checkpoint'].every(c=>got.includes(c)));
t('no achievement from nothing', !got.includes('first_mock')&&!got.includes('streak_7')&&!got.includes('mistakes_10'));
t('achievement xp paid once', refs().includes('ach:first_diagnostic')); const x1=xpSum(); await C.afterActivity(db,'st1',ctx); t('achievements not re-paid', xpSum()===x1&&tables.student_achievements.filter((x:any)=>x.student_id==='st1').length===got.length);
t('xp_total equals ledger', eng().xp_total===xpSum());
t('mission diagnostic item done', tables.mission_items.find((i:any)=>i.kind==='diagnostic').done===true&&tables.daily_missions[0].status==='open');
// ===== S4: daily challenge =====
const r1:any=await C.startChallenge(db,'st1',{mode:'daily',subjectId:M},ctx);
t('daily served', !!r1.question&&r1.question.total===1); t('answer key never sent', !('expected_answer' in r1.question)&&!JSON.stringify(r1.question).includes('Because'));
const r1b:any=await C.startChallenge(db,'st1',{mode:'daily',subjectId:M},ctx); t('daily resumes same attempt', r1b.attemptId===r1.attemptId&&tables.challenge_attempts.filter((x:any)=>x.mode==='daily').length===1);
let ans:any=await C.answerChallenge(db,'st1',r1.attemptId,'A',30,ctx);
t('daily correct + key returned after', ans.correct&&ans.correctAnswer==='A'&&ans.done&&ans.summary.xp.amount===12);
t('daily xp lines', refs().includes('ch:'+r1.attemptId));
const r1c:any=await C.startChallenge(db,'st1',{mode:'daily',subjectId:M},ctx); t('daily done today', r1c.completed===true&&/already/.test(r1c.notice));
const sc:any=await C.startChallenge(db,'st1',{mode:'daily',subjectId:'sc'},ctx); t('daily per subject', !!sc.question&&sc.attemptId!==r1.attemptId);
t('mission complete -> xp once', tables.daily_missions[0].status==='complete'&&refs().filter(r=>r.startsWith('mission:')).length===1);
const mxp=xpSum(); await C.afterActivity(db,'st1',ctx); t('mission xp not repeated', xpSum()===mxp);
// ===== S5: weakness battle (adaptive) =====
const w:any=await C.startChallenge(db,'st1',{mode:'weakness',skillId:'s1'},ctx); t('weakness starts', !!w.question&&w.question.total===8);
const wid=w.attemptId; const pattern=['A','A','B','A','A','A','B','A']; let last:any=null; const diffs:number[]=[];
for(let i=0;i<8;i++){ const att=tables.challenge_attempts.find((x:any)=>x.id===wid); diffs.push(att.plan[att.cursor].difficulty); last=await C.answerChallenge(db,'st1',wid,pattern[i],25,ctx); t('answer '+i+' graded', last.correct===(pattern[i]==='A')); if(i<7&&last.done){t('ended early',false);break;} }
t('weakness finished at 8', last.done&&last.summary.attempted===8&&last.summary.correct===6);
t('difficulty never repeats questions', new Set(tables.challenge_attempts.find((x:any)=>x.id===wid).plan.map((p:any)=>p.qid)).size===8);
t('difficulty steps with performance', diffs.some((d,i)=>i>=2&&diffs[i-1]!==undefined&&d!==diffs[0])||new Set(diffs).size>1);
t('weakness concept note', /First 3 answers/.test(last.summary.conceptNote)&&/Hardest level/.test(last.summary.conceptNote));
t('mastery untouched', !tables.mastery_states||tables.mastery_states.length===0); t('mastery note', /do not change your mastery/i.test(last.summary.masteryNote));
t('weakness mistakes recorded', tables.mistake_book.filter((m:any)=>m.source==='challenge').length===2);
t('next action present', !!last.summary.nextAction.text&&!!last.summary.nextAction.href);
t('weakness xp', last.summary.xp.amount>0&&last.summary.xp.breakdown.some((b:any)=>/Weakness Battle finished/.test(b.label)));
// ===== S6: personal best =====
t('first best recorded as first', last.summary.best?.kind==='first'&&tables.personal_bests.some((p:any)=>p.kind==='quiz_score'&&p.scope_id===M&&p.value===75));
const p1:any=await C.startChallenge(db,'st1',{mode:'practice',subjectId:M},ctx); t('practice 6', p1.question.total===6);
let pr:any; for(let i=0;i<6;i++) pr=await C.answerChallenge(db,'st1',p1.attemptId,'A',20,ctx);
t('new personal best', pr.summary.best.kind==='new_best'&&pr.summary.best.previous===75&&pr.summary.best.value===100&&/NEW PERSONAL BEST/.test(pr.summary.best.message));
t('best stored with previous', tables.personal_bests.find((p:any)=>p.kind==='quiz_score'&&p.scope_id===M).previous_value===75&&tables.personal_bests.find((p:any)=>p.kind==='quiz_score'&&p.scope_id===M).value===100);
t('best xp once per value', refs().filter(r=>r.startsWith('pb:quiz_score:'+M)).length===1);
const p2:any=await C.startChallenge(db,'st1',{mode:'practice',subjectId:M},ctx); let p2r:any; for(let i=0;i<6;i++) p2r=await C.answerChallenge(db,'st1',p2.attemptId,i<3?'A':'B',20,ctx);
t('lower score not a best', p2r.summary.best.kind==='not_best'&&p2r.summary.best.previous===100);
// ===== S7: anti-cheat =====
const f1:any=await C.startChallenge(db,'st1',{mode:'practice',subjectId:'sc'},ctx); let fr:any; const xBefore=xpSum(); for(let i=0;i<6;i++) fr=await C.answerChallenge(db,'st1',f1.attemptId,'A',1,ctx);
t('rushed round earns no xp', fr.summary.xp.amount===0&&xpSum()===xBefore); t('rushed round flagged internally', tables.engagement_flags?.some((f:any)=>f.student_id==='st1'&&f.kind==='many_very_fast_answers'));
t('flag not in student summary', !/flag|suspic|cheat/i.test(JSON.stringify(fr.summary)));
// daily cap
const capCtx={...ctx,settings:C.mergeEngagement({xp:{daily_cap:5}})}; const c1:any=await C.startChallenge(db,'st1',{mode:'mixed',subjectId:M},capCtx); let cr:any; for(let i=0;i<8;i++) cr=await C.answerChallenge(db,'st1',c1.attemptId,'A',20,capCtx);
t('daily cap respected', cr.summary.xp.amount===0&&cr.summary.xp.capped);
// ===== S8: mistake review / correction =====
const open0=tables.mistake_book.filter((m:any)=>m.student_id==='st1'&&m.status!=='corrected').length; t('there are open mistakes', open0>=4);
const rv:any=await C.startChallenge(db,'st1',{mode:'mistake_review'},ctx); const rvA=tables.challenge_attempts.find((x:any)=>x.id===rv.attemptId);
t('review: retries first of original', rvA.plan[0].role==='retry'&&!!rvA.plan[0].mistakeId); t('review: includes similar', rvA.plan.some((p:any)=>p.role==='similar'));
t('similar is a different question', rvA.plan.filter((p:any)=>p.role==='similar').every((s:any)=>!rvA.plan.some((p:any)=>p.role==='retry'&&p.qid===s.qid)));
const firstRetry=rvA.plan[0]; const mRow=tables.mistake_book.find((m:any)=>m.id===firstRetry.mistakeId); const repBefore=mRow.repetitions;
let rr:any=await C.answerChallenge(db,'st1',rv.attemptId,'-98765',20,ctx);
t('wrong retry: stays open, repeat counted', mRow.status==='practising'&&mRow.repetitions===repBefore+1);
const secondRetry=rvA.plan[rvA.cursor]; const mRow2=secondRetry?.role==='retry'?tables.mistake_book.find((m:any)=>m.id===secondRetry.mistakeId):null;
// answer the rest: find the correct answers for retries
let guard=0; while(!rr.done&&guard++<20){ const att=tables.challenge_attempts.find((x:any)=>x.id===rv.attemptId); const it=att.plan[att.cursor]; const tbl=tables[it.table]; const q=tbl.find((x:any)=>x.id===it.qid); const key=q.expected_answer.value; rr=await C.answerChallenge(db,'st1',rv.attemptId,key,20,ctx); }
t('review finished', rr.done&&rr.summary.mistakesCorrected>=1);
t('correct retry -> corrected', tables.mistake_book.some((m:any)=>m.status==='corrected'&&m.corrected_at)); t('correction event logged', tables.engagement_events.some((e:any)=>e.kind==='mistake_corrected'));
t('revision xp bonus', rr.summary.xp.breakdown.some((b:any)=>/Revision|corrected/.test(b.label))||rr.summary.xp.capped);
// ===== S9: comeback =====
const wk=tables.challenge_attempts.find((x:any)=>x.id===wid);
const cb:any=await C.startChallenge(db,'st1',{mode:'comeback',sourceAttemptId:wid},ctx); const cbA=tables.challenge_attempts.find((x:any)=>x.id===cb.attemptId);
t('comeback baseline original', cbA.baseline.correct===6&&cbA.baseline.total===8&&cbA.baseline.percent===75); t('comeback retries the missed', cbA.plan.filter((p:any)=>p.role==='retry').length>=1);
let cr2:any; guard=0; while(!(cr2?.done)&&guard++<20){ const att=tables.challenge_attempts.find((x:any)=>x.id===cb.attemptId); const it=att.plan[att.cursor]; const q=tables[it.table].find((x:any)=>x.id===it.qid); cr2=await C.answerChallenge(db,'st1',cb.attemptId,q.expected_answer.value,20,ctx); }
t('comeback summary shows original vs now', cr2.summary.comeback&&cr2.summary.comeback.original.percent===75&&cr2.summary.comeback.now.percent===100);
let threw=false; try{ await C.startChallenge(db,'st1',{mode:'comeback',sourceAttemptId:'nope'},ctx);}catch{threw=true} t('comeback bad source refused', threw);
// ===== S10: boss =====
const bs:any=await C.startChallenge(db,'st1',{mode:'boss',subjectId:M},ctx); const bsA=tables.challenge_attempts.find((x:any)=>x.id===bs.attemptId);
t('boss 10 questions rising', bsA.plan.length===10&&bsA.plan.every((p:any,i:number)=>i===0||p.difficulty>=bsA.plan[i-1].difficulty)&&bsA.plan[9].difficulty===5);
t('boss only verified', bsA.plan.every((p:any)=>tables.diagnostic_questions.find((q:any)=>q.id===p.qid).content_status==='verified'));
threw=false; let msg=''; try{ await C.startChallenge(db,'st1',{mode:'boss',subjectId:'xx'},ctx);}catch(e:any){threw=true;msg=e.message} t('boss refuses thin bank honestly', threw&&/not enough verified/i.test(msg));
tables.diagnostic_questions.push(dq('mqDraft','s1','dtm',5,'needs_review')); const pool=await C.loadPool(db,ctx,{subjectId:M,verifiedOnly:true}); t('unverified excluded from verified pool', !pool.some(q=>q.id==='mqDraft')); tables.diagnostic_questions.push(dq('mqRej','s1','dtm',5,'rejected')); t('rejected never served', !(await C.loadPool(db,ctx,{subjectId:M})).some(q=>q.id==='mqRej'));
const ch:any=await C.startChallenge(db,'st1',{mode:'challenge',subjectId:M},ctx); t('challenge mode works', !!ch.question);
// ===== S11: streak & achievements =====
tables.challenge_attempts.push({id:'old1',student_id:'st1',mode:'practice',started_at:iso(1),status:'completed',answers:[],plan:[],total:0,correct:0},{id:'old2',student_id:'st1',mode:'practice',started_at:iso(2),status:'completed',answers:[],plan:[],total:0,correct:0});
a=await C.afterActivity(db,'st1',ctx); t('3-day streak', a.streak.current===3&&eng().current_streak===3&&eng().longest_streak>=3); t('streak_3 unlocked', tables.student_achievements.some((x:any)=>x.student_id==='st1'&&x.code==='streak_3'));
t('best streak stored', tables.personal_bests.some((p:any)=>p.kind==='best_streak'&&p.value>=3));
t('mistakes_corrected metric', (await C.achievementMetrics(db,'st1',ctx,3)).mistakes_corrected>=1);
// break streak: another student with a gap
tables.challenge_attempts.push({id:'g1',student_id:'st9',mode:'practice',started_at:iso(5),status:'completed',answers:[],plan:[],total:0,correct:0},{id:'g2',student_id:'st9',mode:'practice',started_at:iso(4),status:'completed',answers:[],plan:[],total:0,correct:0});
tables.students.push({id:'st9',display_name:'Gap Student',grade:'10',created_at:iso(10)}); const gs=await C.refreshStreak(db,'st9',ctx); t('broken streak: 0 current, longest kept, welcome back', gs.current===0&&gs.longest===2&&gs.state==='welcome_back');
// ===== S12: features off / experiments =====
const nx=xpSum(); const offCtx={...ctx,settings:C.mergeEngagement({features:{xp:false}})}; const o1:any=await C.startChallenge(db,'st1',{mode:'practice',subjectId:'sc'},offCtx); let o1r:any; for(let i=0;i<6;i++) o1r=await C.answerChallenge(db,'st1',o1.attemptId,'A',20,offCtx);
t('xp off: nothing awarded, round still recorded', xpSum()===nx&&o1r.done);
const expCtx={...ctx,settings:C.mergeEngagement({experiments:{achievements:{pct:0},missions:{pct:0}}})}; const e=await C.afterActivity(db,'st9',expCtx); t('experiment 0%: no mission/achievements', e.mission===null&&e.unlocked.length===0);
// ===== S13: quiz hook =====
const bx=tables.challenge_attempts.length; await C.recordQuizRound(db,'st1',{skillId:'s2',review:[...Array(5)].map((_,i)=>({questionId:'mq'+(10+i*2),isCorrect:i<3,yourAnswer:i<3?'A':'Q',correctAnswer:'A'}))},ctx);
const qa=tables.challenge_attempts[bx]; t('quiz round recorded', qa&&qa.mode==='session_quiz'&&qa.total===5&&qa.correct===3&&qa.status==='completed'); t('quiz mistakes recorded', tables.mistake_book.filter((m:any)=>m.last_ref==='ch:'+qa.id).length===2);
// ===== S14: org challenge =====
tables.student_links.push(...['st1','st2','st3'].map(s=>({student_id:s,adult_user_id:'tut1',link_type:'tutor',status:'active'})),{student_id:'st4',adult_user_id:'other',link_type:'tutor',status:'active'});
const today=new Date(Date.now()+5.5*3600000).toISOString().slice(0,10); const end=new Date(Date.now()+5.5*3600000+6*86400000).toISOString().slice(0,10);
const oid=await C.createOrgChallenge(db,'tut1',{title:'Algebra week',scope:'weekly',subjectId:M,size:8,startsOn:today,endsOn:end});
t('org challenge made', !!oid&&tables.org_challenges.length===1);
threw=false; try{ await C.createOrgChallenge(db,'tut1',{title:'x',scope:'weekly'});}catch{threw=true} t('org invalid refused', threw);
const vis1=await C.challengesForStudent(db,'st1'); t('linked student sees it', vis1.length===1&&vis1[0].groupSize===3&&vis1[0].done===false); t('unlinked student sees none', (await C.challengesForStudent(db,'st4')).length===0);
const o_a:any=await C.startChallenge(db,'st1',{mode:'org',orgChallengeId:oid},ctx), o_b:any=await C.startChallenge(db,'st2',{mode:'org',orgChallengeId:oid},ctx);
const planOf=(id:string)=>tables.challenge_attempts.find((x:any)=>x.id===id).plan.map((p:any)=>p.qid).join();
t('same questions for everyone', planOf(o_a.attemptId)===planOf(o_b.attemptId)); t('org start twice resumes', (await C.startChallenge(db,'st1',{mode:'org',orgChallengeId:oid},ctx)).attemptId===o_a.attemptId);
for(const [sid,att,right] of [['st1',o_a.attemptId,6],['st2',o_b.attemptId,3]] as any){ for(let i=0;i<8;i++) await C.answerChallenge(db,sid,att,i<right?'A':'B',20,ctx); }
const stats:any=await C.orgChallengeStats(db,'tut1',oid,idx); t('org stats counts', stats.groupSize===3&&stats.finished===2&&stats.started===2&&stats.participationPct===67); t('org average', stats.averageAccuracy===Math.round((75+37.5)/2)||stats.averageAccuracy===56||stats.averageAccuracy===57);
t('org improvement needs enough students', stats.improvement===null); t('org weak topics aggregate only', stats.weakTopics.length>0&&!JSON.stringify(stats).match(/st1|st2|Arvind|Meera/));
t('other tutor cannot read stats', (await C.orgChallengeStats(db,'intruder',oid,idx))===null);
const vis2:any=await C.challengesForStudent(db,'st3'); t('student sees only counts', vis2[0].groupFinished===2&&!JSON.stringify(vis2).match(/st1|st2|Arvind|Meera|75|37/));
const vis3:any=await C.challengesForStudent(db,'st1'); t('own score visible to self', vis3[0].done&&vis3[0].myScore==='6 of 8');
// ===== S15: leaderboard =====
threw=false; try{ await C.joinClassBoard(db,'st1','Arvind Fan',ctx.settings);}catch(e:any){threw=true;msg=e.message} t('real name nickname refused', threw&&/real name/.test(msg));
await C.joinClassBoard(db,'st1','Curious Fox 42',ctx.settings); threw=false; try{ await C.joinClassBoard(db,'st2','Curious Fox 42',ctx.settings);}catch(e:any){threw=true;msg=e.message}
/* nickname uniqueness is a Postgres unique index: checked in the psql step */
let board:any=await C.loadClassBoard(db,'st1',ctx.settings); t('board hidden with 1 member', board.hidden);
await C.joinClassBoard(db,'st3','Brave Owl 7',ctx.settings); await C.joinClassBoard(db,'st2','Swift Otter 3',ctx.settings);
board=await C.loadClassBoard(db,'st1',ctx.settings); t('board visible with 3', board&&!board.hidden&&board.members===3);
const bj=JSON.stringify(board); t('board has nicknames only', /Curious Fox 42/.test(bj)&&!/Arvind|Meera|Ravi|Tiwari|Sharma|Kumar/.test(bj)&&!/"st[0-9]"/.test(bj)&&!/studentId/.test(bj));
await C.leaveBoards(db,'st2'); t('leave removes entry and nickname', !tables.leaderboard_entries.some((e:any)=>e.student_id==='st2')&&tables.student_engagement.find((r:any)=>r.student_id==='st2').nickname===null);
t('leaderboard off -> refused', await (async()=>{try{await C.joinClassBoard(db,'st4','Calm Lion 11',C.mergeEngagement({features:{leaderboard:false}}));return false}catch{return true}})());
// ===== S16: home + adult summary =====
const home=await C.loadEngagementHome(db,'st1',ctx); t('home shape', home.mission&&home.battles!==undefined&&Array.isArray(home.journeys)&&typeof home.nextStep==='string'&&home.streak.current>=3);
t('home: achieved today from evidence', home.achievedToday.some((x:string)=>/answered/.test(x))); t('home notices capped', home.notices.length<=ctx.settings.notifications.max_per_day);
t('home journey for maths', home.journeys.some(j=>j.subjectId===M&&j.journey.stages[0].status==='done')); t('home bests have labels', home.bests.some(b=>/Best quiz score/.test(b.label)));
const ws=await C.weeklySummary(db,'st1','Arvind',idx); t('weekly summary sentence', /^This week Arvind studied on/.test(ws.sentence)&&ws.enough); t('weekly: no predictions', !/predict|rank|will score/i.test(ws.sentence+ws.facts.join()));
const ws2=await C.weeklySummary(db,'st4','Zed',idx); t('weekly: no data -> insufficient', !ws2.enough&&/Insufficient data/.test(ws2.sentence));
// ===== S17: admin metrics =====
const met=await C.loadEngagementMetrics(db,ctx.settings); t('metrics shape', met.totalStudents===5&&met.dau>=1&&met.trend.length===30&&met.missionCompletion.created>=1); t('metrics: d30 cohort not yet eligible -> insufficient', met.d30.rate===null&&met.d30.eligible===0); t('metrics: d1 retention computed', met.d1.eligible===5);
t('metrics: no names', !JSON.stringify(met).match(/Arvind|Meera|Tiwari/)); t('metrics: flags listed without names', met.flags.length>=1&&!JSON.stringify(met.flags).match(/Arvind/));
t('metrics: achievements counted', met.achievementsUnlocked30>=1);
// ===== S18: settings persistence =====
const saved=await C.saveEngagementSettings(db,{features:{xp:false},xp:{practice_correct:5}}); t('settings saved merged', saved.xp.practice_correct===5&&saved.features.xp===false&&saved.xp.diagnostic===30);
t('settings load', (await C.loadEngagementSettings(db)).xp.practice_correct===5); threw=false; try{await C.saveEngagementSettings(db,{xp:{bogus:1}});}catch{threw=true} t('bad settings refused', threw);
console.log(`t57 integration: ${ok} passed, ${bad} failed`);
} catch(e:any){ console.log('CRASH',e.stack||e); bad++; console.log(`t57 integration: ${ok} passed, ${bad} failed`);} })();
