import { loadSheetData } from '../packages/core/metrics/funnel';
// Minimal in-memory Supabase fake: select/eq/gte/lt/order/range/count head.
const T: Record<string, any[]> = {
  students:[{id:'s1',display_name:'Asha',created_at:'2026-10-01T00:00:00Z'},{id:'s2',display_name:'Ravi',created_at:'2026-10-02T00:00:00Z'},{id:'s3',display_name:'=Evil',created_at:'2026-10-03T00:00:00Z'}],
  student_access:[{student_id:'s1',plan_code:'founding_family'},{student_id:'s2',plan_code:'free'}],
  diagnostic_attempts:[{student_id:'s1',status:'completed'},{student_id:'s2',status:'in_progress'}],
  learning_sessions:[1,2,3,4].map(i=>({student_id:'s1',started_at:new Date(Date.now()-i*86400000).toISOString()})),
  mock_exams:[{student_id:'s1',status:'submitted',score:30,total:40}],
  learning_goals:[{student_id:'s1',subject_id:'m',status:'active'},{student_id:'s1',subject_id:'sc',status:'active'}],
  learning_events:[{student_id:'s1',event_type:'report_viewed'}],
  pilot_payments:[{student_id:'s1',offer_label:'FF',amount:4999,status:'confirmed',transaction_reference:'UPI123',pilot_start_date:'2026-10-20',pilot_end_date:'2027-03-31',created_at:'2026-10-18T00:00:00Z',confirmed_at:new Date().toISOString()}],
  question_attempts:Array.from({length:12},(_,i)=>({student_id:'s1',is_correct:i<9,hints_used:i<3?1:0})),
  session_checkins:[{student_id:'s1',confidence_after:7,confidence_before:5,created_at:'2026-10-10T00:00:00Z'}],
  ai_usage:[{provider:'gemini',input_tokens:1000,output_tokens:500,created_at:new Date().toISOString()}],
  content_reviews:[{updated_at:new Date().toISOString()},{updated_at:new Date().toISOString()}],
};
function q(table:string){ let rows=[...(T[table]??[])]; let head=false; const b:any={
  select(_c:string,o?:any){ if(o?.head) head=true; return b; },
  eq(k:string,v:any){ rows=rows.filter(r=>r[k]===v); return b; },
  gte(k:string,v:any){ rows=rows.filter(r=>r[k]>=v); return b; },
  lt(k:string,v:any){ rows=rows.filter(r=>r[k]<v); return b; },
  order(){ return b; }, range(a:number,z:number){ rows=rows.slice(a,z+1); return b; },
  then(res:any){ return Promise.resolve(head?{count:rows.length,data:null}:{data:rows}).then(res); } }; return b; }
const fake:any={from:q};
(async()=>{
  let ok=0,bad=0; const eq=(n:string,a:any,b:any)=>{ if(JSON.stringify(a)===JSON.stringify(b)) ok++; else {bad++;console.log('BAD',n,JSON.stringify(a),JSON.stringify(b));} };
  const month=new Date(Date.now()+5.5*3600000).toISOString().slice(0,7);
  const d=await loadSheetData(fake,{month,teacherRateInr:100});
  const f=(k:string)=>d.funnel.find(x=>x.key===k)!.count;
  eq('signup',f('signup'),3); eq('started',f('diag_start'),2); eq('done',f('diag_done'),1); eq('report',f('report'),1);
  eq('learn',f('learn'),1); eq('active',f('active'),1); eq('paid',f('paid'),1); eq('retained',f('retained'),1);
  eq('untracked',[f('visit'),f('content'),f('referral')],[null,null,null]);
  eq('student row',d.students[0],{student:'Asha',plan:'founding_family',start_date:'2026-10-01',subjects_chosen:2,sessions:4,last_active:d.students[0].last_active,diagnostic_status:'completed',mock_attempts:1,report_viewed:'yes'});
  eq('student diag',[d.students[1].diagnostic_status,d.students[2].diagnostic_status,d.students[2].plan],['in progress','not started','none']);
  eq('sales',[d.sales[0].verified,d.sales[0].amount_inr,d.sales[0].upi_reference],['yes',4999,'UPI123']);
  eq('product small n',[d.product[0].accuracy_percent,d.product[0].independent_accuracy_percent,d.product[0].latest_confidence,d.product[0].mock_average_percent],[75,50,7,75]);
  eq('product no data',d.product[1].accuracy_percent,null);
  eq('econ',[d.economics.revenueInr,d.economics.teacherCostInr,d.economics.paidStudents],[4999,200,1]);
  eq('margin set',typeof d.economics.grossMarginPercent,'number');
  console.log(ok,'ok',bad,'bad');
})();
