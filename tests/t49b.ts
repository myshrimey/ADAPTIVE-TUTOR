import { fakeSupabase } from './fakedb';
import { saveTestReports } from '../packages/core/index';
const sb:any=fakeSupabase({test_reports:[]});
const input:any={kind:'diagnostic',title:'Diagnostic: Maths',score:2,total:3,inMarks:false,items:[{prompt:'q',group:'A',yourAnswer:'1',correctAnswer:'1',isCorrect:true,answered:true,explanation:null,figureUrl:null,figureCaption:null}]};
(async()=>{
 const a=await saveTestReports(sb,{studentId:'s1',subjectId:'sub',sourceId:'src1',input});
 const b=await saveTestReports(sb,{studentId:'s1',subjectId:'sub',sourceId:'src1',input:{...input,title:'Renamed'}});
 const rows=sb._tables.test_reports;
 console.log(a,b,rows.length,rows.map((r:any)=>r.audience+':'+r.title).join(' | '), 'student has items:', !!rows.find((r:any)=>r.audience==='student').data.items, 'adult has items:', !!rows.find((r:any)=>r.audience==='adult').data.items);
})();
