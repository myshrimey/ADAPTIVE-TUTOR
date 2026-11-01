import { generateLinkCode, normaliseLinkCode, formatLinkCode, isPortalRole, portalHome } from '../packages/core/index';
let ok=0,bad=0; const t=(n:string,c:boolean)=>{c?ok++:(bad++,console.log('FAIL',n))};
const seen=new Set<string>();
for(let i=0;i<500;i++){const c=generateLinkCode(); t('len',c.length===8); t('norm roundtrip',normaliseLinkCode(formatLinkCode(c))===c); seen.add(c);}
t('unique',seen.size>=499);
t('lower+space',normaliseLinkCode('abcd 2346')==='ABCD2346');
t('reject I/0/short',normaliseLinkCode('ABCI2346')===null && normaliseLinkCode('ABC')===null && normaliseLinkCode(undefined)===null);
t('roles',isPortalRole('parent')&&isPortalRole('tutor')&&isPortalRole('centre')&&!isPortalRole('student')&&!isPortalRole('admin')&&!isPortalRole('teacher'));
t('home',portalHome('centre')==='/centre'&&portalHome('teacher')==='/teacher'&&portalHome('admin')==='/admin'&&portalHome('student')==='/dashboard');
console.log('ok',ok,'bad',bad);
