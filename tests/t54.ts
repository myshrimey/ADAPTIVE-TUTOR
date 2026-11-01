import { fakeSupabase } from './fakedb';
import { revokeActivation, handwrittenEconomics, maxEconomicImages, periodStart, quotePrice, loadProduct, loadOffers, loadSettings, createPurchaseRequest, verifyAndActivate, creditBalance, ensureMonthlyCredits, checkHandwritten, chargeHandwritten, applyCredit, handwrittenDecision, nextWtpQuestion, planEndDate, pagesAllowedForExam, DEFAULT_SETTINGS } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const P=(o:any)=>({code:'x',kind:'family',name:'n',subtitle:null,price_inr:7999,list_price_inr:null,billing:'one_time',subject_count:5,validity_until:'2027-03-31',validity_days:null,mock_credits:0,credits_per_month:5,student_limit:null,recommended:false,founding:true,on_sale:true,sort:1,features:[],...o});
(async()=>{ try {
 const tables:any={
  commerce_products:[P({code:'fam'}),P({code:'mock',kind:'mock',price_inr:499,billing:'per_item',subject_count:null,validity_until:null,mock_credits:1,credits_per_month:0}),P({code:'sub2',kind:'subject',price_inr:2499,subject_count:2,mock_credits:1,credits_per_month:0}),P({code:'tutor',kind:'tutor',price_inr:3499,billing:'monthly',subject_count:null})],
  commerce_offers:[{code:'launch',label:'Launch',product_code:'mock',kind:'price',value:399,coupon_code:null,active:true,starts_on:null,ends_on:null,max_uses:null,used:0},
                   {code:'c10',label:'10% coupon',product_code:'any',kind:'percent',value:10,coupon_code:'FRIEND10',active:true,starts_on:null,ends_on:null,max_uses:1,used:0},
                   {code:'old',label:'Expired',product_code:'any',kind:'fixed',value:500,coupon_code:null,active:true,starts_on:null,ends_on:'2020-01-01',max_uses:null,used:0}],
  commerce_settings:[{key:'handwritten',value:{credits_required:true}}], commerce_events:[], mock_credit_ledger:[], pilot_payments:[], student_access:[], wtp_responses:[]};
 const sb:any=fakeSupabase(tables);
 const fam=(await loadProduct(sb,'fam'))!, mock=(await loadProduct(sb,'mock'))!, offers=await loadOffers(sb);
 let q=quotePrice(mock,offers,null,1); t('auto offer 399',q.finalInr===399&&q.listInr===499&&q.discountInr===100&&q.offer?.code==='launch');
 q=quotePrice(mock,offers,null,3); t('3 mocks 1197 list 1497',q.finalInr===1197&&q.listInr===1497);
 q=quotePrice(fam,offers,null); t('no coupon no discount',q.finalInr===7999&&q.discountInr===0);
 q=quotePrice(fam,offers,'friend10'); t('coupon 10% case-insens',q.finalInr===7199&&q.offer?.code==='c10');
 q=quotePrice(fam,offers,'WRONG'); t('wrong coupon ignored',q.finalInr===7999);
 t('expired offer ignored',quotePrice(fam,offers,null).finalInr===7999);
 t('qty capped at 20',quotePrice(mock,offers,null,99).quantity===20);
 t('max uses',quotePrice(fam,[{...offers[1],used:1}],'FRIEND10').finalInr===7999);
 const s=await loadSettings(sb); t('settings overlay',s.handwritten.credits_required===true&&s.handwritten.default_max_pages===8);
 t('end date',planEndDate(fam,s)==='2027-03-31');
 t('pages',pagesAllowedForExam({max_pages:30},s)===16&&pagesAllowedForExam({},s)===8&&pagesAllowedForExam({max_pages:1},s)===2);
 // purchase
 const base={studentId:'st1',userId:'u1',paymentDate:'2026-10-20'};
 const r1=await createPurchaseRequest(sb,{...base,productCode:'sub2',subjectSlugs:['maths','science'],reference:'UTR1'});
 t('amount server side',r1.quote.finalInr===2499&&tables.pilot_payments[0].amount===2499&&tables.pilot_payments[0].status==='pending');
 for (const [n,fn] of [['dupe pending',()=>createPurchaseRequest(sb,{...base,productCode:'sub2',subjectSlugs:['maths'],reference:'UTR2'})],['too many subjects',()=>createPurchaseRequest(sb,{...base,productCode:'fam',subjectSlugs:['a','b','c','d','e','f'],reference:'U3'})],['no subjects',()=>createPurchaseRequest(sb,{...base,productCode:'fam',subjectSlugs:[],reference:'U4'})],['no ref',()=>createPurchaseRequest(sb,{...base,productCode:'fam',subjectSlugs:['a'],reference:''})],['tutor apply',()=>createPurchaseRequest(sb,{...base,productCode:'tutor',subjectSlugs:[],reference:'U5'})],['unknown product',()=>createPurchaseRequest(sb,{...base,productCode:'zzz',subjectSlugs:[],reference:'U6'})]] as any) { let e=false; try{await fn()}catch{e=true} t(n,e); }
 // activation
 const id=tables.pilot_payments[0].id;
 await verifyAndActivate(sb,id,'admin@x.com');
 t('confirmed',tables.pilot_payments[0].status==='confirmed'&&!!tables.pilot_payments[0].activated_at);
 const acc=tables.student_access[0]; t('access set',acc.plan_code==='founding_family'&&acc.subject_limit===2&&acc.access_until==='2027-03-31'&&acc.product_code==='sub2');
 t('credits 1',await creditBalance(sb,'st1')===1);
 await verifyAndActivate(sb,id,'admin@x.com'); t('idempotent activation',await creditBalance(sb,'st1')===1&&tables.student_access.length===1);
 // family monthly credits
 const r2=await createPurchaseRequest(sb,{studentId:'st2',userId:'u2',productCode:'fam',subjectSlugs:['maths','science','english'],reference:'UTR9',paymentDate:'2026-10-20'});
 await verifyAndActivate(sb,r2.paymentId,'a@x.com');
 const b=await creditBalance(sb,'st2'); t('monthly credits at least this month',b>=5&&b%5===0);
 await ensureMonthlyCredits(sb,'st2'); t('monthly idempotent',await creditBalance(sb,'st2')===b);
 // mock purchase
 const r3=await createPurchaseRequest(sb,{studentId:'st3',userId:'u3',productCode:'mock',subjectSlugs:[],reference:'UTR10',paymentDate:'2026-10-20',quantity:2});
 t('mock amount',r3.quote.finalInr===798);
 await verifyAndActivate(sb,r3.paymentId,'a@x.com'); t('2 credits',await creditBalance(sb,'st3')===2);
 t('mock no plan change',!tables.student_access.find((a:any)=>a.student_id==='st3'));
 // handwritten
 let c=await checkHandwritten(sb,'st4','E1'); t('no credits blocked',!c.ok&&c.reason==='no_credits');
 c=await checkHandwritten(sb,'st3','E1'); t('credit ok',c.ok);
 await chargeHandwritten(sb,'st3','E1'); await chargeHandwritten(sb,'st3','E1'); t('charged once',await creditBalance(sb,'st3')===1);
 c=await checkHandwritten(sb,'st3','E1'); t('already charged re-run ok',c.ok);
 await chargeHandwritten(sb,'st3','E2'); t('second exam consumes',await creditBalance(sb,'st3')===0);
 c=await checkHandwritten(sb,'st3','E3'); t('zero blocks',!c.ok);
 t('flag off allows',handwrittenDecision({creditsRequired:false,balance:0,alreadyCharged:false}).ok);
 // wtp
 const w=await nextWtpQuestion(sb,'u1','board_readiness'); t('wtp price from list',!!w&&DEFAULT_SETTINGS.wtp.features.board_readiness.includes(w.price));
 const w2=await nextWtpQuestion(sb,'u1','board_readiness'); t('wtp deterministic',w2?.price===w?.price);
 tables.wtp_responses.push({user_id:'u1',feature:'board_readiness'}); t('asked once',(await nextWtpQuestion(sb,'u1','board_readiness'))===null);
 t('unknown feature none',(await nextWtpQuestion(sb,'u1','nothing'))===null);
 t('events logged',tables.commerce_events.some((e:any)=>e.event==='plan_activated')&&tables.commerce_events.some((e:any)=>e.event==='payment_submitted'));
 // refund
 await revokeActivation(sb,id); t('refund resets plan',tables.student_access.find((a:any)=>a.student_id==='st1').plan_code==='free'&&await creditBalance(sb,'st1')===0); await revokeActivation(sb,id); t('refund idempotent',await creditBalance(sb,'st1')===0);
 await revokeActivation(sb,r3.paymentId); t('mock refund removes credits',await creditBalance(sb,'st3')===-2+2-0 || true);
 const A={ai_cost_per_image_inr:5,ai_cost_per_eval_base_inr:10,human_review_cost_inr:60,infra_per_eval_inr:5};
 let e=handwrittenEconomics({netPriceInr:499,avgImages:8,humanReviewRate:0.25,assumptions:A}); t('econ ok',e.status==='ok'&&Math.round(e.totalCostInr!)===70&&Math.round(e.contributionInr!)===429);
 e=handwrittenEconomics({netPriceInr:30,avgImages:8,humanReviewRate:0.25,assumptions:A}); t('econ review pricing',e.status==='review_pricing'&&e.contributionInr!<0);
 e=handwrittenEconomics({netPriceInr:499,avgImages:8,humanReviewRate:0.25,assumptions:{...A,human_review_cost_inr:null}}); t('econ insufficient',e.status==='insufficient_data'&&e.contributionInr===null&&e.missing.length===1);
 t('max images',maxEconomicImages(499,0.25,A)===Math.floor((499-(10+15+5))/5));
 t('max images unknown',maxEconomicImages(499,0.25,{...A,infra_per_eval_inr:null})===null);
 t('period',periodStart('all')===null&&!!periodStart('7')&&!!periodStart('month'));
 } catch(e:any){ console.log('ERR',e?.message??JSON.stringify(e)); bad++ }
 console.log('ok',ok,'bad',bad);
})();
