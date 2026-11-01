import { composeStudyPlan, phaseForDaysLeft } from '../packages/core/planning/study-plan';
let ok=0,bad=0; const eq=(n:string,a:any,b:any)=>{ if(JSON.stringify(a)===JSON.stringify(b)){ok++}else{bad++;console.log('BAD',n,a,b)} };
eq('phase',[phaseForDaysLeft(120),phaseForDaysLeft(60),phaseForDaysLeft(10)],['build','strengthen','revise']);
const base={today:new Date('2026-10-17T12:00:00+05:30'),dailyMinutes:60,sessionsLast14Days:5};
const p=composeStudyPlan({...base,subjects:[
 {subjectId:'m',name:'Maths',priority:'start',hasBaseline:true,coveragePercent:50,mockCount:0,weakSkills:[{skillId:'a',name:'Quadratics',score:30,weakPrerequisites:[{skillId:'b',name:'Factorisation',score:20}]}]},
 {subjectId:'s',name:'Science',priority:'steady',hasBaseline:false,coveragePercent:0,mockCount:0,weakSkills:[]}]});
eq('phase build',p.phase,'build');
eq('weekly',p.weeklyMinutes,300);
eq('prereq first',p.subjects[0].steps.map(x=>x.kind),['repair_prerequisite','practise_weak']);
eq('diag',p.subjects[1].steps[0].kind,'diagnostic');
eq('minutes split',[p.subjects[0].minutesPerWeek,p.subjects[1].minutesPerWeek],[225,75]);
eq('no mock in build',p.subjects[0].steps.some(x=>x.kind==='mock'),false);
const q=composeStudyPlan({...base,today:new Date('2026-12-20T12:00:00+05:30'),sessionsLast14Days:0,dailyMinutes:null,subjects:[{subjectId:'m',name:'Maths',priority:'focus',hasBaseline:true,coveragePercent:60,mockCount:0,weakSkills:[]}]});
eq('strengthen',q.phase,'strengthen');
eq('mock added',q.subjects[0].steps.map(x=>x.kind),['cover_new','mock']);
eq('notes',q.notes.length,2);
eq('default mins',q.usingDefaultMinutes,true);
const r=composeStudyPlan({...base,today:new Date('2027-02-01T12:00:00+05:30'),subjects:[{subjectId:'m',name:'Maths',priority:'steady',hasBaseline:true,coveragePercent:90,mockCount:2,weakSkills:[]}]});
eq('revise',r.subjects[0].steps.map(x=>x.kind),['cover_new','timed_practice']);
const z=composeStudyPlan({...base,subjects:[{subjectId:'m',name:'Maths',priority:'steady',hasBaseline:true,coveragePercent:100,mockCount:0,weakSkills:[]}]});
eq('keep going',z.subjects[0].steps[0].kind,'keep_going');
const late=composeStudyPlan({...base,today:new Date('2027-03-01'),subjects:[]});
eq('past exam',late.daysLeft,0);
console.log(ok,'ok',bad,'bad');
