import { fakeSupabase } from './fakedb';
import { seatCheck, activateOrgPlan, grantStudentCredit, orgBalance, creditBalance, ensureOrgMonthlyCredits, getOrgPlan, orgPlanActive, featureOpen, isPaidAccess, hasFeature, useLimitedFeature, usageDecision, reviewStatusForAnswer, rollUpReviewStatus, addStage, composeRescue, composeProgramme, composeStudyPlan, createPurchaseRequest } from '../packages/core/index';
// v93: this test's plan dates are written for October 2026, so it runs with a fixed clock. With the real clock it failed on 1 November,
// because a new month correctly grants new monthly credits (the product code is right; the test relied on today's date).
const RealDate = Date; const FIXED_NOW = new RealDate('2026-10-26T06:00:00Z').getTime();
(globalThis as any).Date = class extends RealDate { constructor(...a: any[]) { if (a.length) super(...(a as [any])); else super(FIXED_NOW); } static now() { return FIXED_NOW; } } as any;
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const P=(o:any)=>({code:'x',kind:'tutor',name:'Tutor',subtitle:null,price_inr:3499,list_price_inr:null,billing:'monthly',subject_count:null,validity_until:null,validity_days:null,mock_credits:0,credits_per_month:20,student_limit:2,recommended:false,founding:true,on_sale:true,sort:1,features:[],...o});
(async()=>{ try{
 const tables:any={ commerce_products:[P({code:'founding_tutor'}),P({code:'fam',kind:'family',student_limit:null,subject_count:5})], commerce_settings:[], commerce_events:[], users:[{id:'tu1',role:'tutor'},{id:'cu1',role:'centre'}], student_links:[{adult_user_id:'tu1',student_id:'s1',status:'active'}], org_plans:[], org_credit_ledger:[], mock_credit_ledger:[], student_access:[], feature_usage:[], pilot_payments:[] };
 const sb:any=fakeSupabase(tables);
 // seats: enforcement off by default
 let c=await seatCheck(sb,'tu1','s9'); t('off = ok',c.ok&&!c.enforced);
 tables.commerce_settings.push({key:'seats',value:{enforce:true,credits_per_grant:1}});
 c=await seatCheck(sb,'tu1','s9'); t('enforced no plan blocked',!c.ok&&c.reason==='no_plan');
 c=await seatCheck(sb,'tu1','s1'); t('already linked allowed',c.ok);
 // activation
 let threw=false; try{await activateOrgPlan(sb,'cu1','founding_tutor','a@x','R1')}catch{threw=true} t('plan/account mismatch refused',threw);
 threw=false; try{await activateOrgPlan(sb,'tu1','fam','a@x','R1')}catch{threw=true} t('non-org product refused',threw);
 const r=await activateOrgPlan(sb,'tu1','founding_tutor','a@x','R1',new Date('2026-10-20T00:00:00Z'));
 t('31 days',r.accessUntil==='2026-11-20');
 const r2=await activateOrgPlan(sb,'tu1','founding_tutor','a@x','R1',new Date('2026-10-20T00:00:00Z')); t('same ref no double extension',r2.accessUntil==='2026-11-20');
 t('limit from product',(await getOrgPlan(sb,'tu1'))!.studentLimit===2);
 const r3=await activateOrgPlan(sb,'tu1','founding_tutor','a@x','R2',new Date('2026-10-25T00:00:00Z')); t('renew extends from end',r3.accessUntil==='2026-12-21');
 t('monthly credits once',await orgBalance(sb,'tu1')===20); await ensureOrgMonthlyCredits(sb,'tu1'); t('monthly idempotent',await orgBalance(sb,'tu1')===20);
 c=await seatCheck(sb,'tu1','s2'); t('seat free',c.ok&&c.used===1&&c.limit===2);
 tables.student_links.push({adult_user_id:'tu1',student_id:'s2',status:'active'});
 c=await seatCheck(sb,'tu1','s3'); t('seat limit',!c.ok&&c.reason==='seat_limit');
 t('plan active fn',orgPlanActive({userId:'x',productCode:'p',studentLimit:1,creditsPerMonth:0,accessUntil:'2020-01-01',status:'active'})===false);
 // grants
 let g=await grantStudentCredit(sb,'tu1','s2','00000000-0000-0000-0000-000000000001'); t('grant ok',g.ok&&g.balance===19&&await creditBalance(sb,'s2')===1);
 g=await grantStudentCredit(sb,'tu1','s2','00000000-0000-0000-0000-000000000001'); t('same grant twice no double',await creditBalance(sb,'s2')===1&&await orgBalance(sb,'tu1')===19);
 g=await grantStudentCredit(sb,'tu1','s7','00000000-0000-0000-0000-000000000002'); t('not linked refused',!g.ok&&g.reason==='not_linked'&&await orgBalance(sb,'tu1')===19);
 tables.org_plans[0].access_until='2020-01-01'; g=await grantStudentCredit(sb,'tu1','s2','00000000-0000-0000-0000-000000000003'); t('expired refused',!g.ok&&g.reason==='plan_expired');
 tables.org_plans[0].access_until='2099-01-01';
 tables.org_credit_ledger.push({user_id:'tu1',delta:-100,reason:'x',ref:'x'}); g=await grantStudentCredit(sb,'tu1','s2','00000000-0000-0000-0000-000000000004'); t('empty pool refused',!g.ok&&g.reason==='no_org_credits'&&await creditBalance(sb,'s2')===1);
 // entitlements
 const ent={enforce:true,paid_features:['board_readiness']};
 t('free blocked',!featureOpen('board_readiness',false,ent)); t('paid open',featureOpen('board_readiness',true,ent)); t('non-listed open',featureOpen('adaptive_learning',false,ent)); t('enforce off',featureOpen('board_readiness',false,{...ent,enforce:false}));
 t('paid access',isPaidAccess({plan_code:'founding_family',access_until:'2099-01-01'})&&!isPaidAccess({plan_code:'free'})&&!isPaidAccess({plan_code:'founding_family',access_until:'2020-01-01'})&&!isPaidAccess(null));
 t('hasFeature free',!(await hasFeature(sb,'sx','board_readiness')));
 tables.student_access.push({student_id:'sx',plan_code:'founding_family',access_until:'2099-01-01'}); t('hasFeature paid',await hasFeature(sb,'sx','board_readiness'));
 // limited features
 t('usage fn',usageDecision(4,5).allowed&&!usageDecision(5,5).allowed&&usageDecision(2,5).remaining===3);
 let n=0; for(let i=0;i<7;i++){ if((await useLimitedFeature(sb,'sfree','voice')).allowed) n++; } t('free voice limit 5',n===5);
 t('paid voice unlimited',(await useLimitedFeature(sb,'sx','voice')).allowed&&(await useLimitedFeature(sb,'sx','voice')).limit===null);
 // review status
 t('answer map',reviewStatusForAnswer('ai_marked')==='AI_EVALUATED'&&reviewStatusForAnswer('needs_teacher')==='HUMAN_REVIEW_REQUIRED'&&reviewStatusForAnswer('unreadable')==='HUMAN_REVIEW_REQUIRED'&&reviewStatusForAnswer('teacher_done')==='HUMAN_REVIEWED');
 t('rollup waiting',rollUpReviewStatus(['ai_marked','needs_teacher'])==='HUMAN_REVIEW_REQUIRED'); t('rollup all ai',rollUpReviewStatus(['ai_marked','ai_marked'])==='AI_EVALUATED'); t('rollup reviewed',rollUpReviewStatus(['teacher_done','ai_marked'])==='HUMAN_REVIEWED'); t('rollup empty',rollUpReviewStatus([])===null);
 let st=addStage(null,{stage:'quality_check',ok:true,at:'1'}); st=addStage(st,{stage:'quality_check',ok:false,at:'2'}); t('stage replaced',st.length===1&&!st[0].ok);
 // rescue
 const ws=(n:string,s:number,pre?:any)=>({skillId:n,name:n,score:s,weakPrerequisites:pre?[pre]:[]});
 const subs:any=[{subjectId:'m',name:'Maths',priority:'focus',hasBaseline:true,weakSkills:[ws('Quadratics',30,{skillId:'f',name:'Factorising',score:20}),ws('Ratios',45)]},{subjectId:'s',name:'Science',priority:'steady',hasBaseline:true,weakSkills:[ws('Ohm',40)]}];
 let rp=composeRescue({subjects:subs,days:7,dailyMinutes:null}); t('rescue has days',!rp.needsEvidence&&rp.days.length>=3&&rp.days.length<=7);
 t('prereq before weak',rp.days[0].task.includes('Factorising')&&rp.days[1].task.includes('Quadratics'));
 t('last day timed check',rp.days[rp.days.length-1].task.toLowerCase().includes('timed'));
 t('minutes default 45',rp.days[0].minutes===45);
 t('no evidence',composeRescue({subjects:[{...subs[0],hasBaseline:false}],days:7,dailyMinutes:30}).needsEvidence);
 t('days clamp',composeRescue({subjects:subs,days:999,dailyMinutes:null}).days.length<=30);
 // programme
 const plan=composeStudyPlan({today:new Date('2026-10-20'),examStart:'2027-01-12',dailyMinutes:45,sessionsLast14Days:3,subjects:subs.map((s:any)=>({...s,coveragePercent:50,mockCount:0}))});
 const pg=composeProgramme(plan,{datesSet:true}); t('programme weeks',pg.weeks.length===plan.weeksLeft&&pg.weeks[0].items.length===2);
 t('checkpoint fortnightly',pg.weeks[1].checkpoint!==null&&pg.weeks[0].checkpoint===null);
 t('programme capped',composeProgramme({...plan,weeksLeft:40},{datesSet:false}).weeks.length===16);
 // parent purchase records who paid
 tables.commerce_products.push(P({code:'sub1',kind:'subject',price_inr:1499,billing:'one_time',subject_count:1,credits_per_month:0,student_limit:null}));
 await createPurchaseRequest(sb,{studentId:'s1',userId:'a',productCode:'sub1',subjectSlugs:['maths'],reference:'U77',paymentDate:'2026-10-20',paidByUserId:'parent1'});
 t('paid_by stored',tables.pilot_payments.at(-1).paid_by_user_id==='parent1');
 }catch(e:any){console.log('ERR',e?.message??JSON.stringify(e));bad++}
 console.log('ok',ok,'bad',bad);
})();
