import { computeCommandCentre, rangeBounds, inRange, dateInRange, fitScore, weightedPipeline, ragStatus, normaliseSource, DEFAULT_SETTINGS } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const now=new Date('2026-10-20T10:00:00Z'); const S:any=JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
const iso=(d:number)=>new Date(now.getTime()-d*86400000).toISOString();
const empty=()=>({users:[],students:[],sessions:[],attempts:[],mocks:[],payments:[],revenueEntries:[],access:[],expenses:[],aiUsage:[],adults:[],orgPlans:[],links:[],crm:[],funding:[],tasks:[],evals:[],events:[],docs:[],products:[{code:'mock',kind:'mock',price_inr:499},{code:'fam',kind:'family',price_inr:7999}]}) as any;
// ranges
let r=rangeBounds('today',{},now); t('today starts IST midnight',r.from==='2026-10-19T18:30:00.000Z');
r=rangeBounds('7',{},now); t('7 days',r.from==='2026-10-13T18:30:00.000Z'); t('month',rangeBounds('month',{},now).from==='2026-09-30T18:30:00.000Z');
t('quarter',rangeBounds('quarter',{},now).from==='2026-09-30T18:30:00.000Z'); t('year',rangeBounds('year',{},now).from==='2025-12-31T18:30:00.000Z');
t('all null',rangeBounds('all').from===null); const cu=rangeBounds('custom',{from:'2026-10-01',to:'2026-10-10'},now); t('custom inclusive end',cu.to==='2026-10-10T18:30:00.000Z'&&inRange('2026-10-10T10:00:00Z',cu)&&!inRange('2026-10-11T10:00:00Z',cu));
t('bad custom ignored',rangeBounds('custom',{from:'x'},now).from===null); t('unknown key -> 30 days',rangeBounds('zzz',{},now).key==='30');
t('dateInRange',dateInRange('2026-10-20',rangeBounds('today',{},now))&&!dateInRange('2026-10-18',rangeBounds('today',{},now)));
// scoring
t('fit none',fitScore({},S.fit_weights).score===null); t('fit full',fitScore(Object.fromEntries(Object.keys(S.fit_weights).map(k=>[k,5])),S.fit_weights).score===100);
t('fit partial weights',fitScore({education:5,ai:0},{education:3,ai:2}).score===60&&fitScore({education:5,ai:0},{education:3,ai:2}).rated===2);
t('fit clamps',fitScore({education:9},{education:1}).score===100);
const wp=weightedPipeline([{stage:'deck_sent',amount:1000000},{stage:'passed',amount:5000000},{stage:'due_diligence',amount:2000000},{stage:'x',amount:null}],S.funding_probabilities,['passed']);
t('weighted',wp.potential===3000000&&wp.weighted===150000+800000&&wp.counted===2);
t('rag hi',ragStatus(70,{green:60,amber:40})==='green'&&ragStatus(50,{green:60,amber:40})==='amber'&&ragStatus(10,{green:60,amber:40})==='red'&&ragStatus(null,{green:1,amber:1})==='grey');
t('rag lower',ragStatus(20,{green:30,amber:50},true)==='green'&&ragStatus(60,{green:30,amber:50},true)==='red');
t('sources',normaliseSource('WhatsApp')==='whatsapp'&&normaliseSource('fb')==='facebook'&&normaliseSource('')==='direct'&&normaliseSource('weird')==='other'&&normaliseSource('<script>')==='other');
// empty business: no invention
let d=computeCommandCentre(empty(),S,rangeBounds('30',{},now),now);
t('empty profit insufficient',d.margins.profit.value===null&&d.margins.profit.label==='INSUFFICIENT'); t('empty cac insufficient',d.unit.cac.value===null);
t('empty health grey',d.health==='grey'); t('empty revenue 0 actual',d.revenue.total.value===0);
t('empty advises costs? no (no expenses -> asks)',d.actions.some((a:any)=>/Record your costs/.test(a.text)));
t('empty investors advice',d.actions.some((a:any)=>/investor research/.test(a.text)));
// populated
const x=empty();
x.users=[{id:'u1',role:'student',created_at:iso(5),source:'whatsapp'},{id:'u2',role:'student',created_at:iso(5),source:'whatsapp'},{id:'u3',role:'student',created_at:iso(40),source:null},{id:'p1',role:'parent',created_at:iso(3)},{id:'t1',role:'tutor',created_at:iso(3)}];
x.students=[{id:'s1',user_id:'u1',created_at:iso(5)},{id:'s2',user_id:'u2',created_at:iso(5)},{id:'s3',user_id:'u3',created_at:iso(40)}];
x.attempts=[{student_id:'s1',status:'completed',started_at:iso(4),completed_at:iso(4)},{student_id:'s2',status:'in_progress',started_at:iso(4),completed_at:null},{student_id:'s3',status:'completed',started_at:iso(30),completed_at:iso(30)}];
x.sessions=[{student_id:'s1',started_at:iso(3),status:'completed',starting_mastery:40,ending_mastery:50},{student_id:'s1',started_at:iso(2),status:'completed',starting_mastery:50,ending_mastery:60},{student_id:'s3',started_at:iso(20),status:'completed',starting_mastery:30,ending_mastery:35}];
x.payments=[{student_id:'s1',amount:7999,status:'confirmed',product_code:'fam',quantity:1,created_at:iso(2),confirmed_at:iso(1),payment_method:'upi'},{student_id:'s2',amount:499,status:'confirmed',product_code:'mock',quantity:1,created_at:iso(1),confirmed_at:iso(1),payment_method:'upi'},{student_id:'s3',amount:999,status:'pending',product_code:'fam',created_at:iso(5)}];
x.revenueEntries=[{received_on:iso(1).slice(0,10),customer_kind:'tutor',customer_name:'T',product:'Tutor plan',amount_inr:3499,method:'upi'}];
x.access=[{student_id:'s1',plan_code:'founding_family',product_code:'fam',access_until:'2027-03-31'}];
x.expenses=[{spent_on:iso(3).slice(0,10),category:'marketing',amount_inr:1000},{spent_on:iso(3).slice(0,10),category:'infrastructure',amount_inr:500},{spent_on:iso(3).slice(0,10),category:'teacher',amount_inr:800}];
x.links=[{adult_user_id:'p1',link_type:'parent'}]; x.adults=[{user_id:'t1',role:'tutor',status:'active'}];
x.crm=[{kind:'school',name:'A School',stage:'demo',status:'open',potential_value:100000,next_followup:iso(2).slice(0,10),extra:{pilot_status:'running',pilot_end:new Date(now.getTime()+5*86400000).toISOString().slice(0,10)}},{kind:'parent',name:'P',stage:'paid',status:'won',amount_paid:1500}];
x.funding=[{kind:'investor',name:'I',stage:'deck_sent',amount_requested:1000000,eligibility_status:'needs_verification'},{kind:'government',name:'G',stage:'researching',eligibility_status:'potential_fit',deadline:new Date(now.getTime()+5*86400000).toISOString().slice(0,10)}];
x.docs=[{key:'a',status:'complete'},{key:'b',status:'missing'}]; x.tasks=[{status:'open',due:'2020-01-01'}];
x.evals=[{status:'needs_teacher',created_at:iso(2)},{status:'ai_marked',created_at:iso(2)}];
d=computeCommandCentre(x,S,rangeBounds('30',{},now),now);
t('students 3',d.today.students.value===3); t('families 1',d.today.families.value===1); t('paid accounts 1',d.today.paidAccounts.value===1); t('tutors 1',d.today.tutors.value===1);
t('revenue = payments + entries',d.revenue.total.value===7999+499+3499); t('pending not revenue',d.revenue.total.value!==7999+499+3499+999);
t('handwritten revenue',d.revenue.handwritten.value===499); t('institutional revenue',d.revenue.institutional.value===3499);
t('by type',d.revenue.byType.tutor===3499&&d.revenue.byType.student_family===8498);
t('diag completion 1 of 2',d.users.diagnosticCompletion.value===50); t('activation 2/3',Math.abs((d.users.activation.value??0)-66.7)<0.1);
t('costs total = 2300',d.costs.total.value===2300); t('contribution = rev - variable(800)',d.margins.contribution.value===11997-800); t('profit = rev - all',d.margins.profit.value===11997-2300);
t('cac = marketing / new payers (2)',d.unit.cac.value===500); t('ltv to date = rev/payers(3)',d.unit.ltvToDate.value===Math.round(11997/3));
t('ltv/cac',d.unit.ltvToCac.value!==null);
t('sources whatsapp 2 signups, 2 paid? only s1 paid',d.sources.whatsapp.signups===2&&d.sources.whatsapp.paid===1&&d.sources.whatsapp.revenue===7999+499);
t('funnel signups 2 (in range)',d.funnel[1].count===2); t('funnel visitor not tracked',d.funnel[0].count===null);
t('avg change needs 10',d.learning.avgMasteryChange.value===null);
t('human review 50%',d.handwritten.humanReviewPercent.value===50);
t('overdue crm counted',d.crm.overdue.value===1); t('weighted crm',d.crm.weighted.value===Math.round(100000*0.35));
t('funding weighted',d.funding.weighted.value===150000&&d.funding.potential.value===1000000);
t('docs missing',d.funding.docsMissing.value===1); t('govt applications 0 (not applied)',d.funding.govtApplications.value===0);
t('alert pending payment',d.alerts.some((a:any)=>/payment/.test(a.text))); t('alert funding deadline',d.alerts.some((a:any)=>/Funding deadline/.test(a.text))); t('alert pilot end',d.alerts.some((a:any)=>/pilot ends/.test(a.text))); t('alert overdue task',d.alerts.some((a:any)=>/task/.test(a.text))); t('alert plan expiry none',!d.alerts.some((a:any)=>/end within 14/.test(a.text)));
t('actions sorted',d.actions.every((a:any,i:number,arr:any[])=>i===0||arr[i-1].priority<=a.priority));
t('type comparison parent won 1',d.typeComparison.find((r:any)=>r.kind==='parent')!.won===1);
t('pilots counted',d.b2b.pilots.value===1);
// AI cost
x.aiUsage=[{student_id:'s1',tier:'paid',provider:'claude',feature:'tutor',ok:true,input_tokens:100000,output_tokens:50000,created_at:iso(1)}];
const d2=computeCommandCentre(x,S,rangeBounds('30',{},now),now); t('ai cost list estimate >0',(d2.costs.aiListEstimate.value??0)>0);
// privacy: output has no student names / emails
const json=JSON.stringify(d2); t('no email/name fields leak',!/@/.test(json)&&!/display_name/.test(json));
// economics review pricing
const S2:any=JSON.parse(JSON.stringify(S)); S2.economics={ai_cost_per_image_inr:50,ai_cost_per_eval_base_inr:10,human_review_cost_inr:300,infra_per_eval_inr:20};
const d3=computeCommandCentre(x,S2,rangeBounds('30',{},now),now); t('review pricing alert',d3.alerts.some((a:any)=>/REVIEW PRICING/.test(a.text))&&d3.handwritten.economics.status==='review_pricing');
console.log('ok',ok,'bad',bad);
