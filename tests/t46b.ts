import { fakeSupabase } from './fakedb';
import { evaluateHandwrittenPaper, getPaperReport, submitTeacherScore, retainAnswerBank, removeAllSheets, saveSheet, getTeacherItem, listTeacherQueue, loadAgreement, recordHandwritingConsent, getHandwritingConsent } from '../packages/core/handwriting/handwriting.service';
let ok=0,bad=0; const t=(n:string,c:boolean,x?:any)=>{c?ok++:(bad++,console.log('FAIL',n,x??''))};
const db = {
  mock_exams: [{ id:'e1', student_id:'s1', kind:'blueprint', delivery:'paper', status:'submitted', subject_id:'sub1', subjects:{id:'sub1',name:'Science',slug:'science'},
    paper_layout:[{questionIds:['q1','q2','q3']}], result:{score:3,total:4,pendingWritten:[{questionId:'q2',marks:2},{questionId:'q3',marks:5}]} }],
  diagnostic_questions: [
    {id:'q1',prompt:'mcq?',question_type:'mcq',marks:1,expected_answer:{value:'A'},explanation:null},
    {id:'q2',prompt:'Define work.',question_type:'short_answer',marks:2,expected_answer:{value:'Force times displacement'},explanation:'W=Fs'},
    {id:'q3',prompt:'Explain photosynthesis.',question_type:'short_answer',marks:5,expected_answer:{value:'6CO2+6H2O->glucose+O2 in chloroplast with light'},explanation:null}],
  students: [{id:'s1',answer_bank_consent:true}], answer_sheets: [], handwritten_evaluations: [], answer_bank: [],
};
const sb = fakeSupabase(db as any);
const reply = { answers:[
  {questionNo:2,found:true,transcription:'Work is force multiplied by displacement in direction',score:2,confidence:'high',feedback:'Good'},
  {questionNo:3,found:true,transcription:'Plants make food using light',score:2,confidence:'high',feedback:'Partial'} ]};
let calls=0, lastImages=0;
const ai:any = { supportsImages:true, complete: async (p:any)=>{ calls++; lastImages=p.images?.length??0; return { text: JSON.stringify(reply) }; } };
(async()=>{
  try { await evaluateHandwrittenPaper(sb,ai,'s1','e1'); t('no pages -> error',false); } catch(e:any){ t('no pages -> error', e.message==='no_pages_uploaded'); }
  await saveSheet(sb,'s1','e1',1,Buffer.from('jpegbytes'),{ok:1},9); await saveSheet(sb,'s1','e1',2,Buffer.from('jpegbytes2'),{ok:1},10);
  t('two sheets stored', db.answer_sheets.length===2 && sb._files.size===2);
  try { await saveSheet(sb,'s1','e1',9,Buffer.from('x'),{},1); t('page 9 refused',false);} catch(e:any){ t('page 9 refused', e.message==='bad_page_number'); }
  const r = await evaluateHandwrittenPaper(sb,ai,'s1','e1',()=>0.99);
  t('AI called once with 2 images', calls===1 && lastImages===2);
  t('q2 ai_marked, q3 (5-mark partial) -> teacher', r.marked===1 && r.needsTeacher===1 && r.unreadable===0, r);
  let rep = await getPaperReport(sb,'s1','e1');
  t('report counts only AI-marked, says waiting', rep.writtenScore===2 && rep.writtenTotalMarked===2 && rep.waitingForTeacher===1 && !rep.complete, rep);
  const q = await listTeacherQueue(sb); t('queue has 1 item, no student info', q.length===1 && !JSON.stringify(q).includes('s1'), q);
  const evalId = db.handwritten_evaluations.find((e:any)=>e.status==='needs_teacher').id;
  const item = await getTeacherItem(sb,evalId); t('teacher item has key + signed page urls', item.answerKey.includes('chloroplast') && item.pages.length===2 && item.pages[0].url.startsWith('https://signed'));
  try { await submitTeacherScore(sb,'tu1',evalId,9,''); t('score above max refused',false);} catch(e:any){ t('score above max refused', e.message==='bad_score'); }
  await submitTeacherScore(sb,'tu1',evalId,3,'Mention chloroplast');
  rep = await getPaperReport(sb,'s1','e1'); t('after teacher: complete, total 5', rep.writtenScore===5 && rep.complete, rep);
  // re-run must not overwrite teacher_done
  await evaluateHandwrittenPaper(sb,ai,'s1','e1',()=>0.99);
  const row = db.handwritten_evaluations.find((e:any)=>e.question_id==='q3'); t('teacher mark kept after re-run', row.teacher_score===3 && row.status==='teacher_done', row);
  const ag = await loadAgreement(sb); t('agreement counts the teacher-checked answer', ag.overall.n===1 && ag.overall.aiLower===1, ag.overall);
  // consent
  await recordHandwritingConsent(sb,'s1',true); const c = await getHandwritingConsent(sb,'s1'); t('consent current', c.given && c.current && c.bank);
  // bank is OFF by default: nothing retained
  const rb = await retainAnswerBank(sb,'s1'); t('answer bank off -> nothing kept', rb.retained===0 && db.answer_bank.length===0 && /switched off/.test(rb.skippedReason!), rb);
  await removeAllSheets(sb,'s1'); t('photos removed from storage', sb._files.size===0);
  // unreadable path
  await saveSheet(sb,'s1','e1',1,Buffer.from('jpegbytes'),{ok:1},9);
  sb._tables.answer_sheets = [];
  const ai2:any = { supportsImages:true, complete: async()=>({text:'garbage'}) };
  try { await evaluateHandwrittenPaper(sb,ai2,'s1','e1'); t('garbage response error',false);} catch(e:any){ t('garbage response error', e.message==='no_pages_uploaded' || e.message==='handwriting_unreadable_response', e.message); }
  console.log(ok,'ok',bad,'bad');
})();
