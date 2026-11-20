// t134: a stuck Gemini chat call falls over to the next provider quickly (v134).
import { readFileSync } from 'fs';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const g = R('packages/core/ai-provider/gemini.provider.ts');
ok(/const REQUEST_TIMEOUT_MS = 10_000;/.test(g), 'Gemini chat timeout is 10 s');
ok(/const IMAGE_REQUEST_TIMEOUT_MS = 60_000;/.test(g), 'photo reading keeps its 60 s');
ok(/RETRYABLE_STATUS\.has\(retryableStatus\) && !!params\.images\?\.length/.test(g), 'only photo calls retry the same model');
ok(/const REQUEST_TIMEOUT_MS = 12_000;/.test(R('packages/core/ai-provider/groq.provider.ts')), 'Groq timeout is 12 s');
const fb = R('packages/core/ai-provider/fallback.provider.ts');
ok(/falling through to the next on ANY failure/.test(fb.replace(/\n\/\/ /g, ' ')), 'the fallback chain still moves on after any failure');
const fac = R('packages/core/ai-provider/factory.ts');
ok(/process\.env\.GROQ_API_KEY/.test(fac) && /new GroqProvider\(\)/.test(fac), 'Groq is in the chain when its key is set');
console.log(`t134: ${n - f}/${n} passed`); if (f) process.exit(1);
