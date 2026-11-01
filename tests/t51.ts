import { fakeSupabase } from './fakedb';
import { keepsNumbers, parseTranslations, ensureHindiTranslations, loadHindi, hasDevanagari } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
t('numbers kept',keepsNumbers('Find the roots of x^2 - 5x + 6 = 0 (12 marks)','x^2 - 5x + 6 = 0 के मूल ज्ञात कीजिए (12 अंक)'));
t('number lost',!keepsNumbers('A train travels 120 km in 2 hours','एक रेलगाड़ी 12 किमी में 2 घंटे चलती है'));
t('devanagari digits ok',keepsNumbers('Find 25% of 80','80 का २५% ज्ञात कीजिए'));
t('hasDevanagari',hasDevanagari('अम्ल')&&!hasDevanagari('acid'));
const batch:any[]=[{id:'a',prompt:'What is the value of 3 + 4?',options:['5','7','9','12'],questionType:'mcq',expectedAnswerText:null,explanation:null},{id:'b',prompt:'Name the gas released when zinc reacts with acid.',options:null,questionType:'short_answer',expectedAnswerText:'hydrogen',explanation:null},{id:'c',prompt:'Speed is 40 km/h.',options:null,questionType:'numeric',expectedAnswerText:null,explanation:null}];
const good=JSON.stringify({items:[{id:'a',prompt:'3 + 4 का मान क्या है?',options:['5','7','9','12'],answer:null,explanation:null},{id:'b',prompt:'जिंक के अम्ल से अभिक्रिया करने पर कौन-सी गैस निकलती है?',options:null,answer:'हाइड्रोजन',explanation:null},{id:'c',prompt:'चाल 14 किमी/घंटा है।',options:null,answer:null,explanation:null}]});
const out=parseTranslations('```json\n'+good+'\n```',batch);
t('2 accepted, c rejected (number changed)',out.length===2&&!out.find(x=>x.questionId==='c'));
t('short answer hindi kept',out.find(x=>x.questionId==='b')!.answerText==='हाइड्रोजन');
t('wrong option count rejected',parseTranslations(JSON.stringify({items:[{id:'a',prompt:'3 + 4 का मान?',options:['5','7'],answer:null}]}),batch).length===0);
t('still english rejected',parseTranslations(JSON.stringify({items:[{id:'b',prompt:'Name the gas released when zinc reacts',options:null,answer:null}]}),batch).length===0);
t('garbage rejected',parseTranslations('not json',batch).length===0);
(async()=>{
  const sb:any=fakeSupabase({question_translations:[],diagnostic_questions:[
   {id:'a',prompt:'What is the value of 3 + 4?',question_type:'mcq',options:['5','7','9','12'],expected_answer:'7',explanation:null},
   {id:'b',prompt:'Name the gas released when zinc reacts with acid.',question_type:'short_answer',options:null,expected_answer:{value:'hydrogen'},explanation:null},
   {id:'h',prompt:'अम्ल क्या है?',question_type:'short_answer',options:null,expected_answer:'x',explanation:null}]});
  let calls=0; const ai:any={complete:async()=>{calls++;return {text:good,usage:{inputTokens:0,outputTokens:0}}}};
  const n=await ensureHindiTranslations(sb,ai,['a','b','h']);
  const m=await loadHindi(sb,['a','b','h']);
  t('saved 2 (Hindi question skipped)',n===2&&m.size===2&&!m.has('h'));
  const n2=await ensureHindiTranslations(sb,ai,['a','b','h']);
  t('second run does nothing, no AI call',n2===0&&calls===1);
  const failing:any={complete:async()=>{throw new Error('down')}};
  const sb2:any=fakeSupabase({question_translations:[],diagnostic_questions:sb._tables.diagnostic_questions});
  t('AI down: returns 0, no throw',(await ensureHindiTranslations(sb2,failing,['a']))===0);
  console.log('ok',ok,'bad',bad);
})();
