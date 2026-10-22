import { NextResponse } from 'next/server';
import { createServiceClient, getCurrentStudentId } from '@/lib/supabase-server';
import { languagesForStudent, saveLangPrefs, LANGUAGE_KINDS } from '@adaptive-tutor/core';
import { getServerLang } from '@/lib/language';

// The student's four independent language choices. The student id always comes from the signed-in session.
export async function GET() {
  try {
    const studentId = await getCurrentStudentId();
    const device = await getServerLang();
    const r = await languagesForStudent(createServiceClient(), studentId, device);
    return NextResponse.json({ data: { prefs: r.prefs, effective: { app: r.app, question: r.question, learning: r.learning, report: r.report }, conflicts: r.conflicts, device, languages: r.languages.filter((l) => l.enabled), kinds: LANGUAGE_KINDS }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 }); }
}

export async function POST(req: Request) {
  try {
    const studentId = await getCurrentStudentId();
    const body = await req.json();
    const prefs = await saveLangPrefs(createServiceClient(), studentId, body);
    return NextResponse.json({ data: { prefs }, error: null });
  } catch (err: any) { return NextResponse.json({ data: null, error: err.message ?? 'error' }, { status: 400 }); }
}
