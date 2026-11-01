import { startMockExam, getMockExam, submitMockExam, listSubmittedMocks } from '../packages/core/mock/mock-exam.service';
let fails=0; const ck=(n:string,ok:boolean,extra?:any)=>{ if(!ok){fails++; console.log('FAIL',n,extra??'')} else console.log('PASS',n)};

// ---- tiny in-memory supabase fake -----------------------------------------------------
const db:Record<string,any[]>={};
const get=(o:any,path:string)=>path.split('.').reduce((a,k)=>a==null?undefined:a[k],o);
function from(table:string){
  let rows=()=>db[table]??(db[table]=[]);
  const filters:((r:any)=>boolean)[]=[]; let op='select'; let patch:any=null; let single=false; let lim=1e9; let ord:any=null; let ins:any=null;
  const q:any={
    select:(_c?:string)=>{ if(op==='select'||op==='update'||op==='insert') {} return q;},
    eq:(k:string,v:any)=>{filters.push(r=>get(r,k)===v);return q},
    neq:(k:string,v:any)=>{filters.push(r=>get(r,k)!==v);return q},
    in:(k:string,vs:any[])=>{filters.push(r=>vs.includes(get(r,k)));return q},
    order:(k:string,o:any)=>{ord={k,asc:o?.ascending!==false};return q},
    limit:(n:number)=>{lim=n;return q},
    single:()=>{single=true;return q},
    update:(p:any)=>{op='update';patch=p;return q},
    insert:(p:any)=>{op='insert';ins=p;return q},
    then:(res:any,rej:any)=>{ try{
      let out:any;
      if(op==='insert'){ const row={id:'id'+Math.random().toString(36).slice(2),status:'in_progress',kind:'full_mock',started_at:new Date().toISOString(),answers:{},...ins}; rows().push(row); out={data:single?row:[row],error:null}; }
      else{ let m=rows().filter(r=>filters.every(f=>f(r)));
        if(op==='update'){ m.forEach(r=>Object.assign(r,patch)); out={data:m.map(r=>({id:r.id})),error:null}; }
        else{ if(ord) m=[...m].sort((a,b)=>(a[ord.k]<b[ord.k]?-1:1)*(ord.asc?1:-1)); m=m.slice(0,lim); out=single?(m[0]?{data:m[0],error:null}:{data:null,error:{message:'none'}}):{data:m,error:null}; } }
      return Promise.resolve(out).then(res,rej);}catch(e){return Promise.reject(e).then(res,rej)} }
  };
  return q;
}
const service:any={from};

// ---- fixture: 2 chapters; 14 mcq + 8 numeric ----------------------------------------------
db.subjects=[{id:'S1',name:'Science',status:'ready'}];
db.chapters=[{id:'C1',name:'Chem'},{id:'C2',name:'Phys'}];
const mk=(i:number,type:string,ch:string,extra:any={})=>({id:'Q'+i,prompt:'p'+i,question_type:type,options:type==='mcq'?['a','b']:null,expected_answer:type==='mcq'?{value:'a'}:{value:'5'},explanation:null,figure_url:null,figure_caption:null,expected_time_seconds:type==='mcq'?60:120,marks:null,content_status:'verified',
  skills:{topics:{chapters:{id:ch,name:ch==='C1'?'Chem':'Phys'}}},diagnostic_tests:{subject_id:'S1',is_active:true},...extra});
db.diagnostic_questions=[];
for(let i=0;i<14;i++) db.diagnostic_questions.push(mk(i,'mcq',i%2?'C1':'C2'));
for(let i=14;i<22;i++) db.diagnostic_questions.push(mk(i,'numeric',i%2?'C1':'C2'));
db.diagnostic_questions.push(mk(99,'mcq','C1',{content_status:'rejected'}));
db.mock_exams=[];

(async()=>{
  const b=await startMockExam(service,'stu','S1',{kind:'board_style'});
  const mcq=b.questions.filter(q=>q.questionType==='mcq'), other=b.questions.filter(q=>q.questionType!=='mcq');
  ck('board: 12 mcq then 6 other',mcq.length===12&&other.length===6, [mcq.length,other.length]);
  ck('board: mcq first (sections)', b.questions.slice(0,12).every(q=>q.questionType==='mcq'));
  ck('board: marks shown 1 / 2', mcq.every(q=>q.marks===1)&&other.every(q=>q.marks===2));
  ck('board: total marks 24', b.totalMarks===24, b.totalMarks);
  ck('board: rejected never served', !b.questions.some(q=>q.id==='Q99'));
  ck('board: duration from planning times (12*60+6*120=1440s*1.2=28.8 -> 29)', b.durationMinutes===29, b.durationMinutes);
  // answer all mcq right ('a'), numerics: 3 right of 6
  const ans:Record<string,string>={}; mcq.forEach(q=>ans[q.id]='a'); other.forEach((q,i)=>ans[q.id]=i<3?'5':'9');
  const r=await submitMockExam(service,'stu',b.id,ans,false);
  ck('board: scored in marks 12+6=18 of 24', r.score===18&&r.total===24&&r.percent===75&&r.inMarks===true, r);
  ck('board: chapter totals in marks sum to 24', r.byChapter.reduce((a,c)=>a+c.total,0)===24);
  ck('board: review carries marks', r.review.every(x=>x.marks===(x.questionType==='mcq'?1:2)));

  const c=await startMockExam(service,'stu','S1',{kind:'chapter_check',chapterId:'C1'});
  ck('chapter check: only that chapter, 8 q', c.questions.length===8 && c.questions.every(q=>db.diagnostic_questions.find(d=>d.id===q.id).skills.topics.chapters.id==='C1'), c.questions.length);
  ck('chapter check: names chapter', c.chapterName===null||typeof c.chapterName==='string');
  ck('chapter check: counts not marks', c.totalMarks===null && c.questions.every(q=>q.marks===null));
  const c2=await startMockExam(service,'stu','S1',{kind:'chapter_check',chapterId:'C1'});
  ck('same kind+chapter resumes', c2.id===c.id);
  const s=await startMockExam(service,'stu','S1',{kind:'subject_check'});
  ck('different kind starts a new paper', s.id!==c.id && s.questions.length===10 && s.durationMinutes===15, [s.questions.length,s.durationMinutes]);
  let err=''; try{ await startMockExam(service,'stu','S1',{kind:'chapter_check'}) }catch(e:any){err=e.message}
  ck('chapter check needs a chapter', err==='chapter_required', err);
  const cr=await submitMockExam(service,'stu',c.id,{},false);
  ck('chapter check unanswered scores 0 of 8 (counts)', cr.score===0&&cr.total===8&&cr.inMarks===false, cr);
  const list=await listSubmittedMocks(service,'stu');
  ck('history carries kind', list.some(x=>x.kind==='board_style')&&list.some(x=>x.kind==='chapter_check'));
  // thin bank
  db.diagnostic_questions=db.diagnostic_questions.filter(d=>d.skills.topics.chapters.id!=='C2'||false).slice(0,3);
  err=''; try{ await startMockExam(service,'stu2','S1',{kind:'full_mock'}) }catch(e:any){err=e.message}
  ck('thin bank refused', err==='not_enough_questions', err);
  console.log(fails?`${fails} FAILED`:'ALL PASSED'); process.exit(fails?1:0);
})();
