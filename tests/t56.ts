import { cleanPrefs, resolveLanguages, chooseQuestionVersion, languageInstruction, detectAnswerLanguage, devanagariShare, validateTranslation, composeTwoBoardReadiness, composeTwoBoardProgramme, cleanSubjectRequest, tallyRequests, routeEvaluation, buildHandwritingUserMessage, composeStudyPlan, BOARD_READINESS_LINE } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
// prefs
t('clean ok', cleanPrefs({app:'hi',question:'en'}).error===null);
t('clean unknown', cleanPrefs({report:'fr'}).error!==null);
t('clean junk code', cleanPrefs({app:'<x>'}).error!==null);
t('clean empty', cleanPrefs({}).prefs.app===null);
// resolve
let r=resolveLanguages(null,null); t('defaults en', r.app==='en'&&r.question==='en'&&r.learning==='en'&&r.report==='en'&&r.conflicts.length===0);
r=resolveLanguages(null,'hi'); t('cookie hi: q/report follow, learning en', r.app==='hi'&&r.question==='hi'&&r.report==='hi'&&r.learning==='en');
r=resolveLanguages({app:'en',question:'hi',learning:'hi',report:'en'},null); t('independent', r.app==='en'&&r.question==='hi'&&r.learning==='hi'&&r.report==='en');
r=resolveLanguages({app:'en',question:'fr',learning:null,report:null},null); t('unavailable stated', r.question==='en'&&r.conflicts.some(c=>c.code==='language_not_available'));
r=resolveLanguages({app:'en',question:null,learning:null,report:null},'hi'); t('device differs conflict', r.conflicts.some(c=>c.code==='device_differs'));
r=resolveLanguages({app:null,question:'ta',learning:null,report:null},null,[{code:'en',label:'English',native_label:'English',enabled:true},{code:'ta',label:'Tamil',native_label:'தமிழ்',enabled:true}]); t('new language no code change', r.question==='ta');
// version choice
t('orig', chooseQuestionVersion('en',[]).label==='original');
t('missing fallback', chooseQuestionVersion('hi',[]).label==='fallback_original');
t('rejected', chooseQuestionVersion('hi',[{lang:'hi',status:'rejected'}]).use==='en');
t('failed validation', chooseQuestionVersion('hi',[{lang:'hi',status:'ai_translated',validation:{passed:false}}]).use==='en');
t('teacher checked', chooseQuestionVersion('hi',[{lang:'hi',status:'teacher_checked'}]).label==='checked_by_teacher');
t('ai validated', chooseQuestionVersion('hi',[{lang:'hi',status:'ai_translated',validation:{passed:true}}]).label==='ai_translated_validated');
t('ai unvalidated', chooseQuestionVersion('hi',[{lang:'hi',status:'ai_translated'}]).label==='ai_translated_unvalidated');
t('fallback has reason', !!chooseQuestionVersion('hi',[]).reason);
// instruction
t('en no instruction', languageInstruction('en')===''); t('hi instruction', /Hindi/.test(languageInstruction('hi'))&&/numbers/.test(languageInstruction('hi'))); t('unknown none', languageInstruction('zz')==='');
// detect
t('dev share', devanagariShare('हिंदी')>0.9&&devanagariShare('abc')===0&&devanagariShare('')===0);
t('detect en', detectAnswerLanguage('en','x = 5')==='en'); t('detect hi', detectAnswerLanguage('hi','x का मान पाँच है')!=='en');
t('detect mixed', detectAnswerLanguage('mixed','x का value 5')==='mixed'); t('detect other', detectAnswerLanguage('other','abc')==='other');
t('claimed en but hindi text', detectAnswerLanguage('en','यह उत्तर हिंदी में है')==='hi'); t('empty unknown', detectAnswerLanguage(undefined,'')==='unknown');
t('claimed hi but english text -> mixed', detectAnswerLanguage('hi','x equals five')==='mixed');
// routing
const A=(o:any)=>({questionNo:1,questionId:'q',found:true,transcription:'a'.repeat(60),score:1,maxScore:2,confidence:'high',feedback:'',answerLanguage:'en',...o});
t('en high ai_marked', routeEvaluation(A({}),()=>0.9).status==='ai_marked');
t('hi high ok', routeEvaluation(A({answerLanguage:'hi'}),()=>0.9).status==='ai_marked');
t('hi medium teacher', routeEvaluation(A({answerLanguage:'hi',confidence:'medium'}),()=>0.9).status==='needs_teacher');
t('mixed medium teacher', routeEvaluation(A({answerLanguage:'mixed',confidence:'medium'}),()=>0.9).status==='needs_teacher');
t('other always teacher', routeEvaluation(A({answerLanguage:'other'}),()=>0.9).status==='needs_teacher');
t('en medium low value ok', routeEvaluation(A({confidence:'medium'}),()=>0.9).status==='ai_marked');
t('low teacher', routeEvaluation(A({confidence:'low'}),()=>0.9).status==='needs_teacher');
t('not found unreadable', routeEvaluation(A({found:false,score:null}),()=>0.9).status==='unreadable');
const qs=[{no:1,id:'q',prompt:'P',marks:2,answerKey:'K'}] as any;
t('msg feedback hi', /FEEDBACK LANGUAGE/.test(buildHandwritingUserMessage(qs,1,'hi'))); t('msg none en', !/FEEDBACK LANGUAGE/.test(buildHandwritingUserMessage(qs,1,'en')));
// validate
const en={prompt:'Solve 2x + 3 = 7',options:['x = 2','x = 4','x = 5','x = 1'],answerText:'2',explanation:'2x = 4'};
let v=validateTranslation(en,{prompt:'हल करें 2x + 3 = 7',options:['x = 2','x = 4','x = 5','x = 1'],answerText:'2',explanation:'2x = 4'},'hi'); t('good passes', v.passed);
v=validateTranslation(en,{prompt:'हल करें 2x + 3 = 8',options:en.options,answerText:'2'},'hi'); t('number change fails', !v.passed&&v.failed.includes('numbers_kept'));
v=validateTranslation(en,{prompt:'हल करें 2x 3 7',options:en.options},'hi'); t('symbols lost fails', v.failed.includes('symbols_kept'));
v=validateTranslation(en,{prompt:'हल करें 2x + 3 = 7',options:['x = 2','x = 4','x = 5']},'hi'); t('option count fails', v.failed.includes('option_count'));
v=validateTranslation(en,{prompt:'',options:null},'hi'); t('empty fails', v.failed.includes('not_empty'));
v=validateTranslation({prompt:'Find the area',options:null},{prompt:'Find the area',options:null},'hi'); t('english left in hindi fails', v.failed.includes('script_present'));
// boards
const sub=(o:any)=>({subjectId:'m',slug:'maths',name:'Maths',band:'developing',coveragePercent:40,hasBaseline:true,priority:'focus',weakSkillCount:3,mockCount:0,latestMockPercent:null,...o});
const B=(o:any={})=>({board1_label:'Board Exam 1',board1_date:null,board2_label:'Board Exam 2',board2_date:null,...o});
const now=new Date('2026-10-21T10:00:00+05:30');
let tb=composeTwoBoardReadiness({subjects:[sub({})],boards:B(),now});
t('no dates: not_set, no days', tb.board1.dateStatus==='not_set'&&tb.board1.daysLeft===null&&tb.board2.dateStatus==='not_set'&&tb.gapDays===null);
t('line exact', tb.line===BOARD_READINESS_LINE&&BOARD_READINESS_LINE==='Estimated readiness based on Sahayak assessment evidence.');
t('no marks predicted', !/predict(ed)? (score|marks)|%\s*marks/i.test(JSON.stringify(tb))&&!('predictedMarks' in tb));
tb=composeTwoBoardReadiness({subjects:[sub({})],boards:B({board1_date:'2027-02-17',board2_date:'2027-05-10'}),now});
t('dates set', tb.board1.dateStatus==='set'&&tb.board1.daysLeft!>0&&tb.gapDays===82);
t('board2 focus differs', tb.board1.subjects[0].focus!==tb.board2.subjects[0].focus);
tb=composeTwoBoardReadiness({subjects:[sub({})],boards:B({board1_date:'2026-01-01'}),now}); t('passed', tb.board1.dateStatus==='passed'&&tb.board1.daysLeft===null);
tb=composeTwoBoardReadiness({subjects:[sub({})],boards:B({board1_date:'2027-05-10',board2_date:'2027-02-17'}),now}); t('conflict reported', tb.conflicts.length>0);
tb=composeTwoBoardReadiness({subjects:[sub({}),sub({subjectId:'s',slug:'science',name:'Science'})],boards:B({board2_subjects:['science']}),now});
t('subject filter', tb.board2.subjects.length===1&&tb.board1.subjects.length===2&&tb.conflicts.length>0);
tb=composeTwoBoardReadiness({subjects:[sub({hasBaseline:false,band:'x'})],boards:B(),now}); t('no baseline insufficient', tb.board1.subjects[0].band==='insufficient'&&/Insufficient/.test(tb.board1.subjects[0].focus)&&!tb.anyEvidence);
tb=composeTwoBoardReadiness({subjects:[],boards:B({programme_name:'My Prog'}),now}); t('programme name', tb.programmeName==='My Prog');
// study plan
const P=(ex?:string)=>composeStudyPlan({today:now,examStart:ex,dailyMinutes:null,subjects:[{subjectId:'m',name:'Maths',priority:'focus',hasBaseline:true,coveragePercent:40,mockCount:0,weakSkills:[]}],sessionsLast14Days:3});
let p=P(); t('no date plan', p.datesSet===false&&p.weeksLeft>=12&&p.weeksLeft<=13); p=P('2027-02-17'); t('date plan', p.datesSet===true&&p.examStart==='2027-02-17');
const tp=composeTwoBoardProgramme({name:'N',planBoard1:P('2027-02-17'),planBoard2:null,boards:B({board1_date:'2027-02-17'})}); t('programme one phase', tp.phase1!==null&&tp.phase2===null&&!tp.datesComplete);
const tp2=composeTwoBoardProgramme({name:'N',planBoard1:P('2027-02-17'),planBoard2:P('2027-05-10'),boards:B({board1_date:'2027-02-17',board2_date:'2027-05-10'})}); t('programme two phases', tp2.phase2!==null&&tp2.datesComplete);
// subject requests
t('req ok', cleanSubjectRequest({subject:'  Sanskrit  ',board:'ICSE',language:'hi'}).ok===true);
t('req short', cleanSubjectRequest({subject:'a'}).ok===false); t('req long', cleanSubjectRequest({subject:'x'.repeat(81)}).ok===false);
const c:any=cleanSubjectRequest({subject:'Sanskrit',note:'n'.repeat(500),language:'<b>'}); t('req note cut + bad lang null', c.value.note.length===300&&c.value.language===null);
const tl=tallyRequests([{board:'CBSE',class_level:'10',subject_text:'Sanskrit',language:'hi'},{board:'cbse',class_level:'10',subject_text:'sanskrit',language:null},{board:'CBSE',class_level:'10',subject_text:'Music',language:null}]); t('tally', tl[0].count===2&&tl.length===2);
console.log(`t56: ${ok} passed, ${bad} failed`);
