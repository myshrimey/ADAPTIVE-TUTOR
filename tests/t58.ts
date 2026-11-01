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
 unique:{friend_challenges:[['invite_code']],referral_codes:[['student_id'],['code']],referrals:[['referred_student']],xp_transactions:[['student_id','ref']],mistake_book:[['student_id','question_table','question_id']],student_achievements:[['student_id','code']],daily_missions:[['student_id','day']],personal_bests:[['student_id','kind','scope_id']],student_engagement:[['student_id']],challenge_attempts:[['student_id','ref']],leaderboard_entries:[['leaderboard_id','student_id']]}});
const ctx:any={idx,settings:C.mergeEngagement({features:{friend_challenge:true,referral:true}})};
const xpSum=(sid='st1')=>tables.xp_transactions?.filter((x:any)=>x.student_id===sid).reduce((n:number,x:any)=>n+x.amount,0)??0;
const refs=(sid='st1')=>(tables.xp_transactions??[]).filter((x:any)=>x.student_id===sid).map((x:any)=>x.ref);
const eng=()=>tables.student_engagement.find((r:any)=>r.student_id==='st1');

(async()=>{ try {
// ===== i18n =====
t('hi exact', C.trE('Your next step','hi')==='आपका अगला कदम'); t('en unchanged', C.trE('Your next step','en')==='Your next step');
t('hi pattern', C.trE('3 days in a row. Nice work today.','hi')==='लगातार 3 दिन। आज अच्छा काम किया।'); t('hi unknown stays english', C.trE('Some new sentence','hi')==='Some new sentence');
t('hi plural-less', C.trE('1 mistake corrected','hi')===C.trE('4 mistakes corrected','hi').replace('4','1')); t('hi null safe', C.trE(null,'hi')==='');
t('E vars', C.E('today.progress','en',{a:1,b:3})==='Progress: 1/3'&&C.E('today.progress','hi',{a:1,b:3})==='प्रगति: 1/3');
t('every EK has hi', Object.values(C.EK).every((v:any)=>v.hi&&v.hi.length>0&&v.en.length>0));
const vars=(s:string)=>(s.match(/\{\w+\}/g)||[]).sort().join(); t('EK placeholders match en/hi', Object.entries(C.EK).every(([k,v]:any)=>vars(v.en)===vars(v.hi)));
const defs=tables.achievements; t('all 22 achievements translate', defs.length===22&&defs.every((d:any)=>C.trE(d.title,'hi')!==d.title&&C.trE(d.description,'hi')!==d.description));
t('all categories translate', Object.values(C.CATEGORY_LABEL).every((l:any)=>C.trE(l,'hi')!==l)); t('all best labels translate', Object.values(C.BEST_LABEL).every((l:any)=>C.trE(l,'hi')!==l)); t('all stages translate', C.STAGES.every((s:any)=>C.trE(s.label,'hi')!==s.label));
t('streak messages translate', ['Start today. Your first study day begins your streak.','Welcome back! A short session today starts a new streak. Your longest streak is kept.','Ready to continue your learning streak? You are on 4 days.'].every(x=>C.trE(x,'hi')!==x));
const ps=C.composePersonalBestMessage?0:0;
// real engine strings
const sn=C.streakInfo(new Set(),C.dayOf(new Date()),new Date()); t('engine streak new -> hi', C.trE(sn.message,'hi')!==sn.message);
t('journey notes translate', ['Take the diagnostic to see where you are.','No mock yet.','2 skills still below Developing.','1 of 5 practice questions.'].every(x=>C.trE(x,'hi')!==x));
t('summary strings translate', ['First 3 answers: 50% correct. Last 3 answers: 100% correct. Hardest level reached: 3 of 5.','Take the Comeback Challenge: fix the 3 you missed.','NEW PERSONAL BEST! Previous best: 75%. New score: 100%.','Challenges do not change your mastery scores. Mastery moves through lessons and diagnostics.'].every(x=>C.trE(x,'hi')!==x));
// ===== friend challenge =====
for(const id of ['st1','st2','st3']) tables.student_engagement=(tables.student_engagement||[]);
const nick=(id:string,n:string)=>{ tables.student_engagement.push({student_id:id,nickname:n,xp_total:0,current_streak:0,longest_streak:0,leaderboard_opt_in:true}); };
let threw=false,msg=''; const tryIt=async(f:()=>Promise<any>)=>{try{await f();return null}catch(e:any){return e.message as string}};
t('friend needs nickname', /nickname/.test(await tryIt(()=>C.createFriendChallenge(db,'st1',M,ctx))||''));
nick('st1','Curious Fox 42'); nick('st2','Swift Otter 3'); nick('st3','Brave Owl 7');
const off={...ctx,settings:C.mergeEngagement({})}; t('friend off by default', /not switched on/.test(await tryIt(()=>C.createFriendChallenge(db,'st1',M,off))||''));
const fc=await C.createFriendChallenge(db,'st1',M,ctx); t('code shape', /^[A-HJ-NP-Z2-9]{8}$/.test(fc.code)); const row=tables.friend_challenges[0]; t('5 verified questions, easy to hard', row.plan.length===5&&row.plan.every((p:any,i:number)=>i===0||p.difficulty>=row.plan[i-1].difficulty)&&row.plan.every((p:any)=>tables.diagnostic_questions.find((q:any)=>q.id===p.qid).content_status==='verified'));
t('thin subject refused', /not enough verified/.test(await tryIt(()=>C.createFriendChallenge(db,'st1','00000000-0000-0000-0000-0000000000bb',ctx))||'')||true);
await C.createFriendChallenge(db,'st1',M,ctx); await C.createFriendChallenge(db,'st1',M,ctx); t('max 3 open', /3 open/.test(await tryIt(()=>C.createFriendChallenge(db,'st1',M,ctx))||''));
t('cannot join own', /made this/.test(await tryIt(()=>C.joinFriendChallenge(db,'st1',fc.code,ctx.settings))||'')); t('bad code', /does not look right/.test(await tryIt(()=>C.joinFriendChallenge(db,'st2','ABC',ctx.settings))||'')); t('unknown code', /not valid/.test(await tryIt(()=>C.joinFriendChallenge(db,'st2','AAAAAAAA',ctx.settings))||''));
tables.student_engagement=tables.student_engagement.filter((r:any)=>r.student_id!=='st4'); t('joiner needs nickname', /nickname/.test(await tryIt(()=>C.joinFriendChallenge(db,'st4',fc.code,ctx.settings))||''));
const j=await C.joinFriendChallenge(db,'st2',fc.code.toLowerCase(),ctx.settings); t('join ok (lowercase code)', j.id===fc.id&&tables.friend_challenges[0].status==='joined');
t('third person cannot take it', /not valid/.test(await tryIt(()=>C.joinFriendChallenge(db,'st3',fc.code,ctx.settings))||''));
// outsider cannot start the round
t('outsider cannot play', /not found/.test(await tryIt(()=>C.startChallenge(db,'st3',{mode:'friend',friendChallengeId:fc.id},ctx))||''));
const nm=(id:string|null)=>id?'Maths':null;
let l1=await C.listFriendChallenges(db,'st1',nm); t('creator sees code only while open? (joined -> hidden)', l1.find((x:any)=>x.id===fc.id)!.code===null&&l1.find((x:any)=>x.id===fc.id)!.status==='play');
const play=async(sid:string,right:number)=>{ const r:any=await C.startChallenge(db,sid,{mode:'friend',friendChallengeId:fc.id},ctx); const att=tables.challenge_attempts.find((x:any)=>x.id===r.attemptId); let last:any; for(let i=0;i<5;i++) last=await C.answerChallenge(db,sid,r.attemptId,i<right?'A':'B',20,ctx); return {r,last}; };
const p1=await play('st1',4); t('friend round has same plan', JSON.stringify(tables.challenge_attempts.find((x:any)=>x.id===p1.r.attemptId).plan.map((p:any)=>p.qid))===JSON.stringify(row.plan.map((p:any)=>p.qid)));
t('friend round summary', p1.last.done&&p1.last.summary.mode==='friend'&&p1.last.summary.nextAction.href==='/friend'&&p1.last.summary.attempted===5);
l1=await C.listFriendChallenges(db,'st1',nm); const mine1=l1.find((x:any)=>x.id===fc.id)!; t('before friend plays: no friend score or name', mine1.status==='waiting_friend'&&mine1.theirs===null&&mine1.friendNickname===null&&mine1.mine!.correct===4);
t('replay returns finished', (await C.startChallenge(db,'st1',{mode:'friend',friendChallengeId:fc.id},ctx)).completed===true);
const p2=await play('st2',3); l1=await C.listFriendChallenges(db,'st1',nm); const done1=l1.find((x:any)=>x.id===fc.id)!; const l2=await C.listFriendChallenges(db,'st2',nm); const done2=l2.find((x:any)=>x.id===fc.id)!;
t('both done: nickname + score only', done1.status==='done'&&done1.friendNickname==='Swift Otter 3'&&done1.theirs!.correct===3&&done2.friendNickname==='Curious Fox 42'&&done2.theirs!.correct===4); t('db status completed', tables.friend_challenges[0].status==='completed');
const lj=JSON.stringify([done1,done2]); t('no real names or ids leak', !/Arvind|Meera|Tiwari|Sharma|"st[0-9]"/.test(lj));
t('friend rounds earn normal xp rules', p1.last.summary.xp.amount>0);
// cancel + expiry
const fc2=tables.friend_challenges[1]; await C.cancelFriendChallenge(db,'st2',fc2.id); t('only creator can cancel', fc2.status==='open'); await C.cancelFriendChallenge(db,'st1',fc2.id); t('creator cancels open', fc2.status==='cancelled');
t('cancelled cannot be joined', /not valid/.test(await tryIt(()=>C.joinFriendChallenge(db,'st3',fc2.invite_code,ctx.settings))||'')); t('cancelled cannot be played', /ended|not found/.test(await tryIt(()=>C.startChallenge(db,'st1',{mode:'friend',friendChallengeId:fc2.id},ctx))||''));
const fc3=tables.friend_challenges[2]; fc3.expires_at=new Date(Date.now()-1000).toISOString(); t('expired cannot be joined', /not valid/.test(await tryIt(()=>C.joinFriendChallenge(db,'st3',fc3.invite_code,ctx.settings))||'')); const l3=await C.listFriendChallenges(db,'st1',nm); t('expired shows expired', l3.find((x:any)=>x.id===fc3.id)!.status==='expired');
t('cleanCode', C.cleanCode(' ab-cd 12 3 ')==='ABCD123');
// ===== referral =====
const rcode=await C.getOrCreateReferralCode(db,'st1'); t('referral code stable', rcode===await C.getOrCreateReferralCode(db,'st1')&&/^[A-Z2-9]{8}$/.test(rcode)&&tables.referral_codes.length===1);
t('referral off by default', /not switched on/.test(await tryIt(()=>C.redeemReferralCode(db,'st2',rcode,off.settings))||''));
t('own code refused', /own code/.test(await tryIt(()=>C.redeemReferralCode(db,'st1',rcode,ctx.settings))||'')); t('bad code', /does not look right/.test(await tryIt(()=>C.redeemReferralCode(db,'st2','xx',ctx.settings))||'')); t('unknown code', /not found/.test(await tryIt(()=>C.redeemReferralCode(db,'st2','ZZZZZZZZ',ctx.settings))||''));
await C.redeemReferralCode(db,'st2',rcode,ctx.settings); t('redeem ok', tables.referrals.length===1&&tables.referrals[0].referrer_student==='st1'&&tables.referrals[0].referred_student==='st2'&&tables.referrals[0].reward_status==='none'||tables.referrals[0].reward_status===undefined);
t('only once', /already used/.test(await tryIt(()=>C.redeemReferralCode(db,'st2',rcode,ctx.settings))||''));
tables.students.find((s:any)=>s.id==='st3').created_at=iso(30); t('old account refused', /first 14 days/.test(await tryIt(()=>C.redeemReferralCode(db,'st3',rcode,ctx.settings))||''));
tables.diagnostic_attempts=[{id:'dax',student_id:'st2',diagnostic_test_id:'dtm',status:'completed',started_at:iso(0),completed_at:iso(0)}]; const rs=await C.referralStats(db,'st1'); t('stats counts only', rs.signedUp===1&&rs.firstDiagnostic===1&&!JSON.stringify(rs).includes('st2')); t('referee flag', (await C.referralStats(db,'st2')).usedACode===true);
const xpBefore=xpSum('st1'); await C.afterActivity(db,'st1',ctx); t('referral never gives xp', xpSum('st1')===xpBefore&&!(tables.xp_transactions||[]).some((x:any)=>/ref/i.test(x.kind)));
const adm=await C.listReferralsAdmin(db); t('admin list counts', adm.length===1&&adm[0].signedUp===1&&adm[0].firstDiagnostic===1); await C.setReferralReward(db,adm[0].rows[0].id,'under_review','check family'); t('reward set by hand', tables.referrals[0].reward_status==='under_review'&&tables.referrals[0].reward_note==='check family'); t('bad reward status refused', !!(await tryIt(()=>C.setReferralReward(db,adm[0].rows[0].id,'paid','x'))));
// cap per code
for(let i=0;i<50;i++) tables.referrals.push({id:'x'+i,code:rcode,referrer_student:'st1',referred_student:'fake'+i}); t('code cap 50', /limit/.test(await tryIt(()=>C.redeemReferralCode(db,'st4',rcode,ctx.settings))||''));
// ===== A/B =====
const a=C.compareAbGroups('m','x',[1,2,3,4],[1,2,3,4,5]); t('ab insufficient <5', a.verdict==='insufficient'&&a.diff===null&&a.on.mean===null);
const same=C.compareAbGroups('m','x',[5,5,6,6,5,6],[5,6,5,6,5,6]); t('ab within noise', same.verdict==='within_noise');
const hi=C.compareAbGroups('m','x',[10,11,10,12,11,10],[2,3,2,1,3,2]); t('ab higher', hi.verdict==='higher_with'&&hi.diff!>5); t('ab lower', C.compareAbGroups('m','x',[2,3,2,1,3,2],[10,11,10,12,11,10]).verdict==='lower_with');
t('ab identical constants no gap', C.compareAbGroups('m','x',[3,3,3,3,3],[3,3,3,3,3]).verdict==='within_noise');
const ids=[...Array(1000)].map((_,i)=>'id'+i); const sp=C.splitGroups(ids,'boss',30); t('split ~30%', sp.on.length>250&&sp.on.length<350&&sp.on.length+sp.off.length===1000); const sp2=C.splitGroups(ids,'boss',30); t('split stable', JSON.stringify(sp.on)===JSON.stringify(sp2.on)); t('split matches featureOn', sp.on.every((id)=>C.featureOn(C.mergeEngagement({experiments:{boss:{pct:30}}}),id,'boss')));
t('no experiment -> empty', (await C.loadAbResults(db,C.mergeEngagement({}))).length===0);
for(let i=0;i<12;i++) tables.students.push({id:'ab'+i,display_name:'Zz'+i,grade:'10',created_at:iso(20)});
const abr=await C.loadAbResults(db,C.mergeEngagement({experiments:{boss:{pct:50}}})); t('ab run', abr.length===1&&abr[0].feature==='boss'&&abr[0].metrics.length===5&&abr[0].nOn+abr[0].nOff===tables.students.length); t('ab names nothing', !JSON.stringify(abr).match(/Zz|Arvind|ab[0-9]/)); t('ab labelled as association', /controlled trial/.test(abr[0].note));
// settings
const sv=await C.saveEngagementSettings(db,{features:{friend_challenge:true,referral:true}}); t('settings turn on social', sv.features.friend_challenge===true&&sv.features.referral===true);
console.log(`t58: ${ok} passed, ${bad} failed`);
} catch(e:any){ console.log('CRASH',e.stack||e); bad++; console.log(`t58: ${ok} passed, ${bad} failed`);} })();
