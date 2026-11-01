import { assemblePaper, blueprintFor, chapterQuotas, type PoolQuestion } from '../packages/core/blueprint/blueprint';
import { parseHandwritingResult, routeEvaluation, finalScore, agreementStats } from '../packages/core/handwriting/marking';
import { decideImageQuality } from '../packages/core/handwriting/quality-rules';
import { measureImage, sniffImageType } from '../apps/web/lib/image-quality';
import sharp from 'sharp';
let ok=0,bad=0; const t=(n:string,c:boolean,extra?:any)=>{c?ok++:(bad++,console.log('FAIL',n,extra??''))};
function mulberry(a:number){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
// ---- blueprint
const bp = blueprintFor('maths');
const chapters = Object.keys(bp.chapterWeights);
const pool: PoolQuestion[] = [];
let n=0;
for (const c of chapters) for (let i=0;i<30;i++) { n++; pool.push({id:'m'+n,chapterId:c,chapterSlug:c,type:'mcq',marks:1,difficulty:1+(i%5),cognitive:i%3===0?'apply':'recall',seconds:60}); }
for (const c of chapters) for (let i=0;i<12;i++) { n++; pool.push({id:'s'+n,chapterId:c,chapterSlug:c,type:'short_answer',marks:2,difficulty:1+(i%5),cognitive:null,seconds:120}); }
const p = assemblePaper(pool, bp, { rng: mulberry(1) });
const secA = p.sections[0], secB = p.sections[1];
t('A has 20 mcq', secA.questions.length===20 && secA.shortfall===0);
t('B has 5', secB.questions.length===5);
t('C,D empty with shortfall', p.sections[2].questions.length===0 && p.sections[2].shortfall===6 && p.sections[3].shortfall===4);
t('not complete + issues', !p.validation.complete && p.validation.issues.length>=3);
t('marks add up', p.validation.totalMarks === 20+10, p.validation.totalMarks);
const ids = p.sections.flatMap(s=>s.questions.map(q=>q.id)); t('no duplicates', new Set(ids).size===ids.length);
t('A spread over many chapters', new Set(secA.questions.map(q=>q.chapterSlug)).size>=8, new Set(secA.questions.map(q=>q.chapterSlug)).size);
// weighted: algebra chapters (5 each: 20/4) vs real-numbers 6 -> check no chapter gets > 4 of 20
const cnt = new Map<string,number>(); secA.questions.forEach(q=>cnt.set(q.chapterSlug,(cnt.get(q.chapterSlug)??0)+1));
t('no chapter dominates', Math.max(...cnt.values())<=3, [...cnt.entries()]);
const hardShare=(pp:any)=>pp.sections[0].questions.filter((q:PoolQuestion)=>q.difficulty>=4).length;
let hn=0,hc=0; for(let s=1;s<=20;s++){hn+=hardShare(assemblePaper(pool,bp,{rng:mulberry(s)}));hc+=hardShare(assemblePaper(pool,bp,{rng:mulberry(s),challenge:true}));}
t('challenge has more hard questions', hc>hn+20, {hn,hc});
const pc = assemblePaper(pool,bp,{rng:mulberry(1),challenge:true}); t('challenge shorter time', pc.durationMinutes < p.durationMinutes, [pc.durationMinutes,p.durationMinutes]);
t('same seed same paper', JSON.stringify(assemblePaper(pool,bp,{rng:mulberry(5)}).sections.map(s=>s.questions.map(q=>q.id)))===JSON.stringify(assemblePaper(pool,bp,{rng:mulberry(5)}).sections.map(s=>s.questions.map(q=>q.id))));
t('empty pool', assemblePaper([],bp).validation.totalMarks===0 && assemblePaper([],bp).validation.issues.some(i=>i.includes('No questions')));
const cq = chapterQuotas(20,[{slug:'a',weight:6,available:100},{slug:'b',weight:5,available:2},{slug:'c',weight:5,available:100}]); t('quota respects availability and total', cq.get('b')!<=2 && [...cq.values()].reduce((a,b)=>a+b,0)===20, [...cq.entries()]);
t('generic blueprint for hindi', blueprintFor('hindi').id==='generic-objective-v1');
// ---- marking
const qs=[{no:1,id:'q1',prompt:'p',marks:2,answerKey:'k'},{no:2,id:'q2',prompt:'p',marks:5,answerKey:'k'}];
t('bad json null', parseHandwritingResult('not json',qs)===null);
const r1=parseHandwritingResult('```json\n{"answers":[{"questionNo":1,"found":true,"transcription":"The photosynthesis answer is long enough","score":9,"confidence":"high","feedback":"ok"},{"questionNo":99,"transcription":"x","score":1}]}\n```',qs)!;
t('unknown question dropped, score clamped, missing -> not found', r1.length===2 && r1[0].score===2 && r1[1].found===false && r1[1].score===null);
t('confidence defaults low', parseHandwritingResult('[{"questionNo":1,"found":true,"transcription":"long enough text here","score":1}]',qs)![0].confidence==='low');
const A=r1[0];
t('unreadable', routeEvaluation(r1[1]).status==='unreadable');
t('low conf -> teacher', routeEvaluation({...A,confidence:'low'},()=>0.99).status==='needs_teacher');
t('confident ai_marked', routeEvaluation(A,()=>0.99).status==='ai_marked');
t('sample -> teacher', routeEvaluation(A,()=>0.01).status==='needs_teacher');
t('short reading with marks -> teacher', routeEvaluation({...A,transcription:'short'},()=>0.99).status==='needs_teacher');
t('5 mark partial -> teacher', routeEvaluation({...A,maxScore:5,score:3},()=>0.99).status==='needs_teacher');
t('final score rules', finalScore({status:'teacher_done',ai_score:2,teacher_score:1})===1 && finalScore({status:'ai_marked',ai_score:2,teacher_score:null})===2 && finalScore({status:'needs_teacher',ai_score:2,teacher_score:null})===null);
const ag=agreementStats([{ai_score:2,teacher_score:2,max_score:2},{ai_score:3,teacher_score:2,max_score:5},{ai_score:0,teacher_score:2,max_score:2},{ai_score:null,teacher_score:1,max_score:2}]);
t('agreement', ag.n===3 && ag.exact===1 && ag.withinOne===2 && ag.aiHigher===1 && ag.aiLower===1 && ag.meanAbsDiff===1, ag);
t('agreement empty', agreementStats([]).exactPercent===null);
// ---- image quality
(async()=>{
  const W=1200,H=1600;
  const lines:string[]=[];for(let y=100;y<H;y+=60){lines.push(`<rect x="80" y="${y}" width="${400+((y*7)%600)}" height="6" fill="#111"/>`);for(let x=80;x<900;x+=40)lines.push(`<rect x="${x}" y="${y-30}" width="${8+(x*y)%14}" height="26" fill="#222"/>`)}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="100%" height="100%" fill="#f4f1e8"/>${lines.join('')}</svg>`;
  const good=await sharp(Buffer.from(svg)).jpeg({quality:90}).toBuffer();
  const m1=await measureImage(good); const d1=decideImageQuality(m1.metrics); t('sharp page accepted',d1.ok,[d1.reasons,m1.metrics]);
  const blurry=await sharp(good).blur(14).jpeg().toBuffer(); const d2=decideImageQuality((await measureImage(blurry)).metrics); t('blurred rejected',!d2.ok&&d2.reasons.includes('blurry'),d2.reasons);
  const blank=await sharp({create:{width:W,height:H,channels:3,background:'#f4f1e8'}}).jpeg().toBuffer(); const d3=decideImageQuality((await measureImage(blank)).metrics); t('blank rejected',!d3.ok,d3.reasons);
  const dark=await sharp(good).modulate({brightness:0.15}).jpeg().toBuffer(); const d4=decideImageQuality((await measureImage(dark)).metrics); t('dark rejected',!d4.ok,d4.reasons);
  const tiny=await sharp(good).resize(200,260).jpeg().toBuffer(); const d5=decideImageQuality((await measureImage(tiny)).metrics); t('tiny rejected',!d5.ok&&d5.reasons.includes('too_small'),d5.reasons);
  t('sniff', sniffImageType(good)==='image/jpeg' && sniffImageType(Buffer.from('hello world, not an image at all'))===null);
  t('output downsized', m1.jpeg.length>0 && (await sharp(m1.jpeg).metadata()).height!<=1600);
  console.log(ok,'ok',bad,'bad');
})();
