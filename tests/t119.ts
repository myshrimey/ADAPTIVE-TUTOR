// t119: the profile save route only passes cleaned values to the database (v119).
import { readFileSync } from 'fs';
import { cleanProfileInput, PROFILE_CAPS, PROFILE_ERROR_TEXT } from '../packages/core';
let n = 0, f = 0; const ok = (c: any, m: string) => { n++; if (!c) { f++; console.log('FAIL', m); } };
const R = (p: string) => readFileSync(p, 'utf8');
const good = { schoolName: 'DPS Noida', schoolBoard: 'CBSE', schoolCity: 'Noida', schoolState: 'UP', parentName: 'A Kumar', parentRelation: 'Father', parentOccupation: 'Engineer', parentEmail: 'a@b.in', parentPhone: '+91 98100 00000', siblingsCount: 1, address: '12 Park Road', howHeardAboutUs: 'Friend' };

const r: any = cleanProfileInput(good, [{ classLevel: 9, overallPercentage: 88.456, board: 'CBSE', remarks: 'good' }]);
ok(r.ok && r.details.schoolName === 'DPS Noida' && r.history[0].overallPercentage === 88.46, 'a normal profile passes (percentage rounded to 2 places)');
ok(cleanProfileInput({}, undefined).ok && cleanProfileInput(null, null).ok && cleanProfileInput('x', 5 as any).ok === false, 'empty is fine; a non-list history is refused');
const long: any = cleanProfileInput({ schoolName: 'x'.repeat(5000), address: 'y'.repeat(5000), howHeardAboutUs: 'z'.repeat(5000), parentName: ' ' + 'n'.repeat(500) }, [{ classLevel: 6, remarks: 'r'.repeat(5000), board: 'b'.repeat(500) }]);
ok(long.ok && long.details.schoolName.length === PROFILE_CAPS.school && long.details.address.length === PROFILE_CAPS.address && long.details.howHeardAboutUs.length === PROFILE_CAPS.heard && long.details.parentName.length === PROFILE_CAPS.name, 'long text is cut to its limit');
ok(long.history[0].remarks.length === PROFILE_CAPS.remarks && long.history[0].board.length === PROFILE_CAPS.board, 'long class-row text is cut too');
const odd: any = cleanProfileInput({ schoolName: { a: 1 }, schoolCity: 42, parentName: ['x'], address: '  \u0000\u0007hello  ' }, []);
ok(odd.ok && odd.details.schoolName === null && odd.details.schoolCity === null && odd.details.parentName === null, 'objects, numbers and lists in text boxes are dropped');
ok(odd.details.address === 'hello', 'control characters are removed and spaces trimmed');
ok(cleanProfileInput({ schoolName: '   ' }, []).ok && (cleanProfileInput({ schoolName: '   ' }, []) as any).details.schoolName === null, 'blank becomes empty');

const bad = (d: any, h: any, code: string) => { const x: any = cleanProfileInput(d, h); ok(!x.ok && x.code === code, `refused (${code}): ${JSON.stringify(d).slice(0, 50)} ${JSON.stringify(h)?.slice(0, 50)}`); };
bad({ parentEmail: 'not-an-email' }, [], 'profile_parent_email_invalid'); bad({ parentEmail: 'a@b' }, [], 'profile_parent_email_invalid'); bad({ parentEmail: 'a b@c.in' }, [], 'profile_parent_email_invalid');
bad({ parentPhone: 'call me' }, [], 'profile_parent_phone_invalid'); bad({ parentPhone: '12' }, [], 'profile_parent_phone_invalid'); bad({ parentPhone: '1'.repeat(30) }, [], 'profile_parent_phone_invalid');
ok(cleanProfileInput({ parentPhone: '098100-00000' }, []).ok && cleanProfileInput({ parentPhone: '(011) 2345 6789' }, []).ok, 'ordinary phone formats pass');
bad({ siblingsCount: -1 }, [], 'profile_siblings_invalid'); bad({ siblingsCount: 21 }, [], 'profile_siblings_invalid'); bad({ siblingsCount: 1.5 }, [], 'profile_siblings_invalid'); bad({ siblingsCount: 'many' }, [], 'profile_siblings_invalid');
ok((cleanProfileInput({ siblingsCount: '2' }, []) as any).details.siblingsCount === 2 && (cleanProfileInput({ siblingsCount: '' }, []) as any).details.siblingsCount === null, 'siblings "2" is 2, blank is empty');
bad({}, [{ classLevel: 9, overallPercentage: 101 }], 'profile_percentage_invalid'); bad({}, [{ classLevel: 9, overallPercentage: -1 }], 'profile_percentage_invalid'); bad({}, [{ classLevel: 9, overallPercentage: 'abc' }], 'profile_percentage_invalid');
bad({}, [{ classLevel: 5 }], 'profile_class_invalid'); bad({}, [{ classLevel: 10 }], 'profile_class_invalid'); bad({}, [{ classLevel: 9 }, { classLevel: 9 }], 'profile_class_invalid');
bad({}, [{ classLevel: 6 }, { classLevel: 7 }, { classLevel: 8 }, { classLevel: 9 }, { classLevel: 9 }], 'profile_too_many_rows');
ok(cleanProfileInput({}, [{ classLevel: 6 }, { classLevel: 7 }, { classLevel: 8 }, { classLevel: 9 }]).ok, 'four class rows are fine');
ok(Object.keys(PROFILE_ERROR_TEXT).length === 6 && Object.values(PROFILE_ERROR_TEXT).every((t) => /^[A-Z]/.test(t) && !/profile_|error|invalid/i.test(t)), 'every refusal has a plain-words message');

const route = R('apps/web/app/api/profile/route.ts');
ok(route.indexOf('cleanProfileInput(') > -1 && route.indexOf('cleanProfileInput(') < route.indexOf('upsertStudentProfileDetails(supabase'), 'the route cleans BEFORE saving');
ok(!/upsertStudentProfileDetails\(supabase, studentId, details/.test(route) && !/upsertAcademicHistory\(supabase, studentId, academicHistory/.test(route), 'the raw request values are never passed on');
ok(/getCurrentStudentId\(\)/.test(route), 'the student still comes from the session');
ok(/PROFILE_ERROR_TEXT/.test(R('apps/web/app/profile/page.tsx')), 'the page shows the plain-words message');
console.log(`t119: ${n - f}/${n} passed`); if (f) process.exit(1);
